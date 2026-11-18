import { PublicHeader } from "./components/PublicHeader";
import { PublicFooter } from "./components/PublicFooter";
import { useEffect, useMemo, useState } from "react";
import { ACTUATORS } from "./lib/data";
import { Sidebar } from "./components/Sidebar";
import type { NavItem } from "./components/Sidebar";
import { Hero } from "./components/Hero";
import { BrandGlyph } from "./components/BrandGlyph";
import { HighlightCards } from "./components/HighlightCards";
import { BarChart } from "./components/BarChart";
import type { BarItem } from "./components/BarChart";
import { Scatter } from "./components/Scatter";
import { TradeoffChart } from "./components/TradeoffChart";
import { Legend } from "./components/Legend";
import { colorForBrand, legendFor } from "./lib/brands";
import { DetailPanel } from "./components/DetailPanel";
import { Fold } from "./components/ui/Fold";
import type { Actuator } from "./types";

const NAV: NavItem[] = [
    { id: "highlights", label: "Highlights" },
    { id: "scatter", label: "Torque vs Cost" },
    { id: "tradeoff", label: "Compliance vs Precision" },
];

export default function App({ menuOpen = false }: { menuOpen?: boolean }) {
    const [selected, setSelected] = useState<Actuator | null>(null);
    const [active, setActive] = useState("highlights");

    const legend = useMemo(() => legendFor(ACTUATORS.map((a) => a.brand)), []);
    const rankItems: BarItem[] = useMemo(
        () =>
            ACTUATORS.filter((a) => a.torque_density_nm_per_kg != null)
                .slice()
                .sort(
                    (a, b) =>
                        (b.torque_density_nm_per_kg ?? 0) - (a.torque_density_nm_per_kg ?? 0),
                )
                .slice(0, 20)
                .map((a) => ({
                    id: a.id,
                    name: a.name,
                    value: a.torque_density_nm_per_kg as number,
                    display: `${Math.round(a.torque_density_nm_per_kg as number)}`,
                    flag: a.country_flag,
                    color: colorForBrand(a.brand),
                })),
        [],
    );

    useEffect(() => {
        const ids = NAV.map((n) => n.id);
        const obs = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) setActive(e.target.id);
                }
            },
            { rootMargin: "-45% 0px -50% 0px" },
        );
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el) obs.observe(el);
        }
        return () => obs.disconnect();
    }, []);

    const goTo = (id: string) => {
        setActive(id);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const openById = (id: string) => {
        const a = ACTUATORS.find((x) => x.id === id);
        if (a) setSelected(a);
    };

    return (
        <>
        <PublicHeader path="/" initialOpen={menuOpen} />
        <div className="shell">
            <Sidebar items={NAV} active={active} onSelect={goTo} />

            <main className="content">
                <Hero count={ACTUATORS.length} />

                <section id="highlights" className="block">
                    <h2 className="block-title">
                        <BrandGlyph className="block-tag" />
                        Highlights
                    </h2>
                    <HighlightCards actuators={ACTUATORS} onSelect={openById} />
                </section>

                <section id="scatter" className="block">
                    <h2 className="block-title">
                        <BrandGlyph className="block-tag" />
                        Torque density vs Cost
                    </h2>
                    <ScatterKey />
                    <div className="chart-scroll">
                        <Scatter actuators={ACTUATORS} onSelect={openById} />
                    </div>
                    <Fold title="Colors" headline={`${legend.length} providers`}>
                        <Legend entries={legend} />
                    </Fold>
                    <Fold title="Top 20 by torque density" headline="N·m/kg">
                        <div className="chart-scroll">
                            <BarChart items={rankItems} onSelect={openById} />
                        </div>
                    </Fold>
                </section>

                <section id="tradeoff" className="block">
                    <h2 className="block-title">
                        <BrandGlyph className="block-tag" />
                        Compliance vs Precision
                    </h2>
                    <p className="block-sub">
                        No actuator wins both. A low reduction ratio keeps the joint
                        backdrivable and lets the motor feel contact; a high one makes it
                        stiff and holds position, though how little play it has depends
                        on the gearbox type. Priced actuators with a published ratio,
                        colored by type. The cheapest in each band is labelled, with
                        backlash in arcmin where published.
                    </p>
                    <TradeoffChart actuators={ACTUATORS} onSelect={openById} />
                </section>
            </main>

            <DetailPanel actuator={selected} onClose={() => setSelected(null)} />
        </div>
        <PublicFooter path="/" />
        </>
    );
}

// Picture key for the scatter: the shaded sweet spot and the dotted frontier.
function ScatterKey() {
    return (
        <div className="scatter-key" aria-label="Chart key">
            <span>
                <svg width="18" height="12" aria-hidden="true">
                    <rect width="18" height="12" rx="2" fill="var(--cyan)" opacity="0.14" />
                </svg>
                dense and cheap
            </span>
            <span>
                <svg width="22" height="12" aria-hidden="true">
                    <path d="M1 10 L21 2" stroke="var(--cyan)" strokeDasharray="2 3" strokeWidth="1.5" />
                </svg>
                best trade-off
            </span>
        </div>
    );
}
