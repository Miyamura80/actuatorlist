import "./happydom";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import type { MapTopology } from "../src/components/maps/geo";
import { SupplyChainLab } from "../src/pages/supply-chain/SupplyChainLab";

const WORLD = JSON.parse(readFileSync(new URL("../public/geo/world-110m.json", import.meta.url), "utf8")) as MapTopology;

afterEach(cleanup);
beforeEach(() => window.history.replaceState({}, "", "/lab/supply-chain"));

const SECTIONS = ["stages", "citations", "perspective", "registry", "maps", "flows", "3d"];
const fold = (c: HTMLElement, id: string) => c.querySelector(`#lab-${id} > details`) as HTMLDetailsElement;

test("overview strip: one card per section with an icon and a number, linking to its fold", () => {
    const c = render(<SupplyChainLab />).container;
    const cards = [...c.querySelectorAll(".sc-lab-overview a")];
    expect(cards.map((a) => a.getAttribute("href"))).toEqual(SECTIONS.map((id) => `#lab-${id}`));
    for (const a of cards) {
        expect(a.querySelector("svg[aria-hidden=true]")).not.toBeNull();
        expect(a.querySelector("b")?.textContent?.trim()).not.toBe("");
    }
});

test("every section is a closed fold with a one-line headline", () => {
    const c = render(<SupplyChainLab />).container;
    for (const id of SECTIONS) {
        const d = fold(c, id);
        expect(d).not.toBeNull();
        expect(d.open).toBe(false);
        expect(d.querySelector(".fold-headline")?.textContent?.length).toBeGreaterThan(5);
    }
    expect(fold(c, "perspective").querySelector(".fold-headline")?.textContent).toMatch(/^Without China, \d+% of magnet supply disappears$/);
});

test("heavy kits mount only once opened", () => {
    const c = render(<SupplyChainLab />).container;
    expect(c.querySelector("#lab-flows .sc-lab-flows")).toBeNull();
    expect(c.querySelector("#lab-3d .sc-lab-3d-wait, #lab-3d .sc-lab-3d")).toBeNull();
    const d = fold(c, "flows");
    act(() => {
        d.open = true;
        fireEvent(d, new Event("toggle"));
    });
    expect(c.querySelector("#lab-flows .sc-lab-flows")).not.toBeNull();
    // The company graph waits in its own fold.
    expect(c.querySelector("#lab-flows .sc-lab-sub > details")).not.toBeNull();
});

test("a hash opens the matching fold on load, and on hashchange", () => {
    window.history.replaceState({}, "", "/lab/supply-chain#lab-citations");
    const c = render(<SupplyChainLab />).container;
    expect(fold(c, "citations").open).toBe(true);
    expect(fold(c, "registry").open).toBe(false);
    // A target inside a fold opens the fold around it.
    act(() => {
        window.history.replaceState({}, "", "/lab/supply-chain#perspective-units");
        window.dispatchEvent(new Event("hashchange"));
    });
    expect(fold(c, "perspective").open).toBe(true);
});

test("clicking an overview card opens its fold, even when the hash is unchanged", () => {
    window.history.replaceState({}, "", "/lab/supply-chain#lab-registry");
    const c = render(<SupplyChainLab />).container;
    const d = fold(c, "registry");
    d.open = false;
    fireEvent.click(c.querySelector('.sc-lab-overview a[href="#lab-registry"]') as Element);
    expect(d.open).toBe(true);
});

test("a shared map view opens the map kit", () => {
    window.history.replaceState({}, "", "/lab/supply-chain?company=jl-mag");
    const c = render(<SupplyChainLab topologies={{ world: WORLD }} />).container;
    expect(fold(c, "maps").open).toBe(true);
    expect(fold(c, "stages").open).toBe(false);
});
