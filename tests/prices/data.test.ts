import { describe, expect, test } from "bun:test";
import { ACTUATORS } from "@/catalog";
import {
    HISTORY_RECORDS,
    PRICE_POINTS,
    type PricePoint,
    actuatorsWithHistory,
    classTrends,
    groupStats,
    historyFor,
    isPriced,
    lagCorrelations,
    metalsOverlay,
    pearson,
    priceIndex,
    quantile,
    withinFit,
    yearChange,
    yearFraction,
} from "@/prices";
import { pricesLicenceErrors } from "@/prices/licence";
import { CATALOG_PRICE_DATE, getTrendChart } from "@/trends";

const point = (
    actuatorId: string,
    date: string,
    priceUsd: number,
    torqueNm = 10,
): PricePoint => ({
    actuatorId,
    date,
    priceUsd,
    currency: "USD",
    originalPrice: priceUsd,
    fxRate: 1,
    url: "https://example.com",
    method: "manual",
    sources: [],
    torqueNm,
    usdPerNm: priceUsd / torqueNm,
});

describe("merged history", () => {
    test("every /trends price point is a history point with its sources", () => {
        const chart = getTrendChart("actuator-prices");
        const past = chart?.series.flatMap((s) =>
            s.points
                .filter((p) => !p.sources[0]?.startsWith("catalog:"))
                .map((p) => [s.actuatorId, p]),
        );
        expect(past?.length).toBeGreaterThan(5);
        for (const [id, p] of past ?? []) {
            const match = historyFor(id as string).find(
                (h) => h.date === (p as { date: string }).date,
            );
            expect(match?.sources).toEqual((p as { sources: string[] }).sources);
            expect(match?.method).toBe(
                (p as { sources: string[] }).sources.some((s) => s.startsWith("wb-"))
                    ? "wayback"
                    : "manual",
            );
        }
    });

    test("every priced catalog actuator ends on its catalog price or this month's snapshot", () => {
        // An in-stock snapshot taken in the catalog month supersedes the
        // catalog price (build() drops the catalog point); an out-of-stock one
        // does not, and is skipped as a listed price.
        for (const a of ACTUATORS.filter((x) => x.price_usd != null)) {
            const points = historyFor(a.id);
            const last = points.filter(isPriced).at(-1);
            const monthSnaps = HISTORY_RECORDS.filter(
                (r) =>
                    r.actuatorId === a.id &&
                    !r.outOfStock &&
                    r.date.startsWith(CATALOG_PRICE_DATE),
            );
            const catalog = points.filter((p) => p.sources[0] === `catalog:${a.id}`);
            if (monthSnaps.length > 0) {
                expect({ id: a.id, catalog }).toEqual({ id: a.id, catalog: [] });
                expect(last?.sources[0]).toStartWith("url:");
                expect(last?.date.startsWith(CATALOG_PRICE_DATE)).toBe(true);
                expect(last?.date).toBe(
                    monthSnaps
                        .map((r) => r.date)
                        .sort()
                        .at(-1),
                );
            } else {
                expect(catalog.length).toBe(1);
                expect(last?.date).toBe(CATALOG_PRICE_DATE);
                expect(last?.priceUsd).toBe(a.price_usd as number);
                expect(last?.sources).toEqual([`catalog:${a.id}`]);
            }
        }
        // Every priced actuator has a history; snapshots may add unpriced ones.
        const withHistory = new Set(actuatorsWithHistory());
        for (const a of ACTUATORS.filter((x) => x.price_usd != null))
            expect(withHistory.has(a.id)).toBe(true);
        const priced = new Set(
            ACTUATORS.filter((a) => a.price_usd != null).map((a) => a.id),
        );
        const snapshotted = new Set(HISTORY_RECORDS.map((r) => r.actuatorId));
        const trended = new Set(
            (getTrendChart("actuator-prices")?.series ?? []).map(
                (s) => s.actuatorId ?? s.id,
            ),
        );
        for (const id of withHistory)
            expect({
                id,
                known: priced.has(id) || snapshotted.has(id) || trended.has(id),
            }).toEqual({ id, known: true });
    });

    test("every point records method, url and FX rate", () => {
        for (const p of PRICE_POINTS) {
            expect(p.url.length).toBeGreaterThan(0);
            expect(p.fxRate).toBeGreaterThan(0);
            expect(p.method).toBeTruthy();
        }
    });

    test("the committed history passes the audit", () => {
        expect(pricesLicenceErrors()).toEqual([]);
    });

    test("1-year change carries the last earlier price forward", () => {
        // Expected values come from the history itself, so the test holds as
        // weekly snapshots and back-fills add points.
        for (const id of actuatorsWithHistory()) {
            const priced = historyFor(id).filter((p) => !p.outOfStock);
            const to = priced.at(-1);
            const yc = yearChange(id);
            if (!to) {
                expect(yc).toBeNull();
                continue;
            }
            const cutoff = yearFraction(to.date) - 1 + 1e-9;
            const from = priced.filter((p) => yearFraction(p.date) <= cutoff).at(-1);
            if (!from) {
                expect({ id, yc }).toEqual({ id, yc: null });
                continue;
            }
            expect({ id, from: yc?.from.date }).toEqual({ id, from: from.date });
            expect(yc?.change).toBeCloseTo(to.priceUsd / from.priceUsd - 1, 6);
        }
        expect(yearChange("dynamixel-xm430-w350-t")).not.toBeNull();
    });

    test("fractional years", () => {
        expect(yearFraction("2024")).toBe(2024.5);
        expect(yearFraction("2024-01")).toBeCloseTo(2024 + 0.5 / 12, 6);
        expect(yearFraction("2024-07-01")).toBeGreaterThan(2024.5);
    });
});

describe("learning curve", () => {
    test("an exact 10% yearly fall fits with R² 1", () => {
        const pts = [0, 1, 2, 3].flatMap((k) => [
            {
                point: point("a", `${2020 + k}`, 100 * 0.9 ** k),
                year: 2020.5 + k,
                usdPerNm: 10 * 0.9 ** k,
            },
            {
                point: point("b", `${2021 + k}`, 50 * 0.9 ** k),
                year: 2021.5 + k,
                usdPerNm: 5 * 0.9 ** k,
            },
        ]);
        const fit = withinFit(pts);
        expect(fit?.annualChange).toBeCloseTo(-0.1, 6);
        expect(fit?.r2).toBeCloseTo(1, 6);
        expect(fit?.actuators).toBe(2);
        // A cheaper newer model does not read as a price fall: each actuator
        // is only compared with itself.
        const flat = withinFit([
            { point: point("a", "2020", 100), year: 2020.5, usdPerNm: 10 },
            { point: point("a", "2024", 100), year: 2024.5, usdPerNm: 10 },
            { point: point("b", "2024", 10), year: 2024.5, usdPerNm: 1 },
            { point: point("c", "2025", 10), year: 2025.5, usdPerNm: 1 },
            { point: point("c", "2026", 10), year: 2026.5, usdPerNm: 1 },
        ]);
        expect(flat?.annualChange).toBeCloseTo(0, 9);
    });

    test("too few points give no fit", () => {
        expect(
            withinFit([{ point: point("a", "2020", 1), year: 2020.5, usdPerNm: 1 }]),
        ).toBeNull();
    });

    test("classes on the page have points and a fit where the data allows", () => {
        const trends = classTrends();
        expect(trends.length).toBeGreaterThan(2);
        expect(trends.some((t) => t.fit !== null)).toBe(true);
        for (const t of trends) if (t.fit) expect(t.fit.r2).toBeLessThanOrEqual(1);
    });
});

describe("distribution", () => {
    test("quantiles interpolate", () => {
        expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
        expect(quantile([5], 0.25)).toBe(5);
    });

    test("groups by country with one value per actuator", () => {
        const year = Number(CATALOG_PRICE_DATE.slice(0, 4));
        const groups = groupStats("country", year);
        const total = groups.reduce((s, g) => s + g.n, 0);
        const ids = groups.flatMap((g) => g.values.map((v) => v.actuatorId));
        // One value per actuator, for exactly the actuators priced that year
        // (catalog prices plus any snapshot of an actuator the catalog lacks
        // a price for), so new snapshots do not break the count.
        expect(total).toBe(ids.length);
        expect(new Set(ids).size).toBe(ids.length);
        const pricedThatYear = new Set(
            PRICE_POINTS.filter(
                (p) =>
                    isPriced(p) && p.usdPerNm !== null && p.date.startsWith(`${year}`),
            ).map((p) => p.actuatorId),
        );
        expect([...ids].sort()).toEqual([...pricedThatYear].sort());
        for (const a of ACTUATORS.filter(
            (x) => x.price_usd != null && x.peak_torque_nm,
        ))
            expect(pricedThatYear.has(a.id)).toBe(true);
        const sorted = groups.map((g) => g.median);
        expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
        for (const g of groups)
            expect(
                g.min <= g.q1 && g.q1 <= g.median && g.median <= g.q3 && g.q3 <= g.max,
            ).toBe(true);
    });
});

describe("price index vs NdPr", () => {
    test("chains the mean yearly change across actuators", () => {
        const idx = priceIndex([
            point("a", "2020", 100),
            point("a", "2022", 81),
            point("b", "2021", 50),
            point("b", "2022", 45),
        ]);
        expect(idx.map((i) => i.year)).toEqual([2020, 2021, 2022]);
        expect(idx[0]?.value).toBe(100);
        expect(idx[1]?.value).toBeCloseTo(90, 0);
        // 2021 to 2022: a falls 10%, b falls 10%.
        expect(idx[2]?.value).toBeCloseTo(81, 0);
        expect(idx[2]?.actuators).toBe(2);
    });

    test("lagged correlation uses yearly changes and skips carried metal years", () => {
        const index = [100, 110, 99, 120, 130].map((value, i) => ({
            year: 2020 + i,
            value,
            actuators: 1,
        }));
        const metal = [50, 55, 49.5, 60, 60].map((usdPerKg, i) => ({
            year: 2020 + i,
            usdPerKg,
            carried: i === 4,
            date: String(2020 + i),
            sources: [],
        }));
        const [lag0] = lagCorrelations(index, metal);
        expect(lag0?.n).toBe(3);
        expect(lag0?.r).toBeCloseTo(1, 6);
        expect(pearson([1, 2], [1, 2])).toBeNull();
    });

    test("the live overlay reads NdPr oxide from /metals", () => {
        const o = metalsOverlay();
        expect(o.index.length).toBeGreaterThan(3);
        expect(o.metal.length).toBeGreaterThan(3);
        expect(o.lags.map((l) => l.lag)).toEqual([0, 1, 2]);
    });
});
