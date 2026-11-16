import { type ReactNode, Suspense, lazy, useEffect, useState } from "react";
import { PublicHeader } from "../../components/PublicHeader";
import { PublicFooter } from "../../components/PublicFooter";
import { Fold } from "../../components/ui/Fold";
import { ConfidenceLegend } from "../../components/supply-chain/ConfidenceLegend";
import { FootnotesProvider } from "../../components/supply-chain/footnotes";
import { MarketShareList } from "../../components/supply-chain/MarketShareList";
import { SourcedValue } from "../../components/supply-chain/SourcedValue";
import { SourcesSection } from "../../components/supply-chain/SourcesSection";
import { LeaderBars } from "../../components/supply-chain/LeaderBars";
import { WithoutLeader } from "../../components/supply-chain/WithoutLeader";
import { UnitTranslation } from "../../components/supply-chain/UnitTranslation";
import { WaffleGrid } from "../../components/supply-chain/WaffleGrid";
import { countryName } from "../../../../src/country-flag";
import { leaderOf } from "../../../../src/supply-chain/dominance";
import { percent } from "../../../../src/supply-chain/format";
import { sitePins, supplyArcs } from "../../../../src/supply-chain/map";
import { COMPANIES, SEGMENTS, SEGMENT_LABEL } from "../../../../src/supply-chain/companies";
import { LAB_MINING_HHI, LAB_PATH, LAB_STAGE_SHARES } from "../../../../src/supply-chain/lab-fixtures";
import { marketOf } from "../../../../src/supply-chain/market-share";
import {
    EVS_PER_YEAR,
    DOMINANCE_MARKETS,
    HUMANOIDS_PER_YEAR,
    HUMANOIDS_SHIPPED_2025,
    MAGNET_CAPACITY,
    NDFEB_PER_EV,
    NDFEB_PER_HUMANOID,
} from "../../../../src/supply-chain/perspective";
import { activeLinks, getCompany, sitesOf } from "../../../../src/supply-chain/registry";
import type { Sourced } from "../../../../src/supply-chain/sourced";
import "../tools.css";
import "../../components/supply-chain/supply-chain.css";
import "../../components/supply-chain/perspective.css";
import type { MapTopology } from "../../components/maps/geo";
import { LabFlows } from "./lab/LabFlows";
import { LabMaps } from "./lab/LabMaps";
import { LazyFold } from "./lab/LazyFold";
import "./lab.css";

const TITLE = "Supply-chain kit";

// The 3D bench is its own chunk, so the shared page bundle stays as it was.
const ExplodeKitDemo = lazy(() => import("./ExplodeKitDemo"));

function readouts(): { label: string; value: Sourced<number> }[] {
    const pick = (label: string, v: Sourced<number> | undefined) => (v ? [{ label, value: v }] : []);
    return [
        ...pick("MP Materials revenue", getCompany("mp-materials")?.revenue),
        ...pick("Northern Rare Earth revenue", getCompany("china-northern-rare-earth")?.revenue),
        ...pick("JL MAG Baotou project", sitesOf("jl-mag").find((s) => s.capacity)?.capacity),
        ...pick("Rare earth mining HHI", LAB_MINING_HHI),
    ];
}

function market(id: string) {
    const m = DOMINANCE_MARKETS.find((x) => x.id === id);
    if (!m) throw new Error(`no market ${id}`);
    return m;
}

type SectionId = "stages" | "citations" | "perspective" | "registry" | "maps" | "flows" | "3d";

type Section = {
    id: SectionId;
    title: string;
    // The overview card's one number and what it counts.
    stat: string;
    unit: string;
    // The fold's one-line takeaway.
    headline: string;
    icon: ReactNode;
};

const ICON_PATHS: Record<SectionId, ReactNode> = {
    stages: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    citations: <><path d="M7 7h4v4c0 3-2 5-4 6" /><path d="M14 7h4v4c0 3-2 5-4 6" /></>,
    perspective: <><path d="M12 3v18" /><path d="M5 7h14" /><path d="M5 7l-3 7h6z" /><path d="M19 7l-3 7h6z" /></>,
    registry: <><path d="M4 6h16" /><path d="M4 12h11" /><path d="M4 18h7" /></>,
    maps: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3 3 15 0 18c-3-3-3-15 0-18" /></>,
    flows: <><path d="M3 6c8 0 8 12 18 12" /><path d="M3 18c8 0 8-12 18-12" /></>,
    "3d": <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5" /><path d="M12 12v9" /><path d="M12 12L4 7.5" /></>,
};

function Icon({ id }: { id: SectionId }) {
    return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
        {ICON_PATHS[id]}
    </svg>;
}

function sections(): Section[] {
    const leaders = LAB_STAGE_SHARES.map((r) => leaderOf(r.shares.value)?.key);
    const top = leaders[0];
    const sweep = leaders.filter((k) => k === top).length;
    const magnet = leaderOf(market("magnet").shares.value);
    const pins = sitePins().length;
    const links = activeLinks().length;
    const row = (id: SectionId, title: string, stat: string, unit: string, headline: string): Section =>
        ({ id, title, stat, unit, headline, icon: <Icon id={id} /> });
    return [
        row("stages", "Country share by stage", `${sweep}/${LAB_STAGE_SHARES.length}`, "stages led", `${top ? countryName(top) : "One country"} leads ${sweep} of ${LAB_STAGE_SHARES.length} stages`),
        row("citations", "Citations", String(Math.round(LAB_MINING_HHI.value)), "mining HHI", `${readouts().length} sourced readouts, one per confidence style`),
        row("perspective", "Perspective", magnet ? percent(magnet.share) : "-", "magnets, leader", `Without ${magnet ? countryName(magnet.key) : "the leader"}, ${magnet ? percent(magnet.share) : "most"} of magnet supply disappears`),
        row("registry", "Registry · market share", String(COMPANIES.length), "companies", `${COMPANIES.length} companies across ${SEGMENTS.length} segments`),
        row("maps", "Map kit", String(pins), "sites", `${pins} sites and ${supplyArcs().length} supply arcs on one world map`),
        row("flows", "Flow kit", String(links), "supply links", `Robot BOM Sankey, Nd step and a ${links}-link company graph`),
        row("3d", "3D explode kit", "3D", "loads on open", "Exploded assemblies and a process loop, loaded on open"),
    ];
}

const anchorOf = (id: SectionId) => `lab-${id}`;

// Open every fold around the hash target, so #lab-maps or
// #perspective-units lands on visible content. Footnote hashes belong to
// SourcesSection.
function openHashTarget(hash: string, scroll: boolean) {
    const id = hash.replace(/^#/, "");
    if (!id || id.startsWith("sc-source-")) return;
    let target: HTMLElement | null = null;
    try {
        target = document.getElementById(decodeURIComponent(id));
    } catch {
        return;
    }
    if (!target) return;
    const own = target.matches("details") ? target : target.querySelector(":scope > details");
    if (own instanceof HTMLDetailsElement) own.open = true;
    for (let el = target.parentElement?.closest("details"); el; el = el.parentElement?.closest("details")) {
        el.open = true;
    }
    if (scroll) target.scrollIntoView?.({ block: "start" });
}

// A numbered section folded to one line behind its takeaway.
function LabSection({ section, n, lazy: deferred = false, defaultOpen = false, children }: {
    section: Section;
    n: number;
    lazy?: boolean;
    defaultOpen?: boolean;
    children: ReactNode;
}) {
    const title = <><span className="sc-lab-n">{String(n).padStart(2, "0")}</span>{section.title}</>;
    if (deferred) {
        return <LazyFold id={anchorOf(section.id)} className="sc-lab-sec" label={section.title} title={title} headline={section.headline} defaultOpen={defaultOpen}>
            {children}
        </LazyFold>;
    }
    return <section className="sc-lab-sec" id={anchorOf(section.id)} aria-label={section.title}>
        <Fold title={title} headline={section.headline} defaultOpen={defaultOpen}>{children}</Fold>
    </section>;
}

// Hidden QA page: every shared supply-chain component, rendered with cited
// fixtures, each kit folded behind a one-line takeaway. Noindex; not in the
// sitemap or llms.txt.
export function SupplyChainLab({ menuOpen = false, topologies }: {
    menuOpen?: boolean;
    // Preloaded map outlines (tests); the page fetches them otherwise.
    topologies?: Partial<Record<string, MapTopology>>;
}) {
    const list = sections();
    const by = Object.fromEntries(list.map((s) => [s.id, s])) as Record<SectionId, Section>;
    // A shared map view (?company=, ?site=, ?cluster=) opens the map kit.
    const [mapLinked] = useState(() => /[?&](company|site|cluster)=/.test(window.location.search));
    useEffect(() => {
        const prev = document.title;
        document.title = TITLE;
        openHashTarget(window.location.hash, true);
        const onHash = () => openHashTarget(window.location.hash, true);
        window.addEventListener("hashchange", onHash);
        return () => {
            document.title = prev;
            window.removeEventListener("hashchange", onHash);
        };
    }, []);
    const num = (id: SectionId) => list.findIndex((s) => s.id === id) + 1;
    return <div className="tool-page sc-lab">
        <PublicHeader path={LAB_PATH} initialOpen={menuOpen} supplyChainPreview />
        <FootnotesProvider>
            <main className="tool-main">
                <header className="tool-head">
                    <p className="tool-kicker">Lab · not indexed</p>
                    <h1>Supply-chain kit</h1>
                </header>

                <nav className="sc-lab-overview" aria-label="Kit sections">
                    {list.map((s) => <a key={s.id} href={`#${anchorOf(s.id)}`} onClick={() => openHashTarget(`#${anchorOf(s.id)}`, false)}>
                        <span className="sc-lab-ov-icon">{s.icon}</span>
                        <b>{s.stat}</b>
                        <span className="sc-lab-ov-unit">{s.unit}</span>
                        <span className="sc-lab-ov-title">{s.title}</span>
                    </a>)}
                </nav>

                <LabSection section={by.stages} n={num("stages")}>
                    <WaffleGrid rows={LAB_STAGE_SHARES.map((r) => ({ id: r.id, label: r.label, shares: r.shares.value, source: r.shares }))} />
                </LabSection>

                <LabSection section={by.citations} n={num("citations")}>
                    <ConfidenceLegend />
                    <dl className="sc-lab-readouts">
                        {readouts().map((r) => <div key={r.label}>
                            <dt>{r.label}</dt>
                            <dd><SourcedValue value={r.value} /></dd>
                        </div>)}
                    </dl>
                </LabSection>

                <LabSection section={by.perspective} n={num("perspective")}>
                    <div className="sc-lab-variants">
                        <section className="sc-lab-variant" id="perspective-without-leader">
                            <h3>If China stopped</h3>
                            <WithoutLeader markets={["mining", "separation", "magnet"].map(market)} />
                        </section>
                        <section className="sc-lab-variant" id="perspective-leader-share">
                            <h3>The leader's share</h3>
                            <p className="sc-lab-headline">China controls magnets more tightly than Google controls search.</p>
                            <LeaderBars markets={DOMINANCE_MARKETS} />
                        </section>
                        <section className="sc-lab-variant" id="perspective-units">
                            <h3>What it buys · magnets</h3>
                            <UnitTranslation
                                label="JL MAG Baotou project"
                                quantity={MAGNET_CAPACITY}
                                per={1_000_000}
                                rows={[
                                    { id: "humanoid", label: "Humanoids / yr", icon: "humanoid", perUnit: NDFEB_PER_HUMANOID, result: HUMANOIDS_PER_YEAR },
                                    { id: "ev", label: "Electric cars / yr", icon: "car", perUnit: NDFEB_PER_EV, result: EVS_PER_YEAR },
                                ]}
                                benchmark={{ label: "Humanoids shipped, 2025", icon: "humanoid", value: HUMANOIDS_SHIPPED_2025 }}
                            />
                        </section>
                    </div>
                </LabSection>

                <LabSection section={by.registry} n={num("registry")}>
                    <div className="sc-lab-segments">
                        {SEGMENTS.map((seg) => <section key={seg}>
                            <h3>{SEGMENT_LABEL[seg]}</h3>
                            <MarketShareList companies={COMPANIES.filter((c) => c.segment === seg)} market={marketOf(seg)} />
                        </section>)}
                    </div>
                </LabSection>

                <LabSection section={by.maps} n={num("maps")} lazy defaultOpen={mapLinked}>
                    <LabMaps topologies={topologies} />
                </LabSection>

                <LabSection section={by.flows} n={num("flows")} lazy>
                    <LabFlows />
                </LabSection>

                <LabSection section={by["3d"]} n={num("3d")} lazy>
                    <Suspense fallback={<div className="sc-lab-3d-wait" />}>
                        <ExplodeKitDemo />
                    </Suspense>
                </LabSection>

                <SourcesSection />
            </main>
        </FootnotesProvider>
        <PublicFooter />
    </div>;
}
