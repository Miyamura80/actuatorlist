import { useEffect, useMemo, useRef, useState } from "react";
import { SEGMENTS, SEGMENT_LABEL } from "../../../../../src/supply-chain/companies";
import {
    COUNTRY_AS_OF,
    type CountryPage as CountryPageData,
    clusterSites,
    countryCompanies,
    countryLinks,
    countrySites,
} from "../../../../../src/supply-chain/country-pages";
import { type MapArc, type MapArcEnd, SEGMENT_SHORT, segmentMix, sitePins, supplyArcs } from "../../../../../src/supply-chain/map";
import { getCompany, sitesOf } from "../../../../../src/supply-chain/registry";
import { Arcs } from "../../../components/maps/Arcs";
import { ClusterZoom } from "../../../components/maps/ClusterZoom";
import { insideCluster } from "../../../components/maps/cluster";
import { MapDrawer } from "../../../components/maps/MapDrawer";
import { SelectionFocus } from "../../../components/maps/SelectionFocus";
import { Fold } from "../../../components/ui/Fold";
import { CountryMap } from "../../../components/maps/CountryMap";
import type { MapTopology } from "../../../components/maps/geo";
import { SegmentMix, SegmentTile } from "../../../components/maps/SegmentTile";
import { PublicFooter } from "../../../components/PublicFooter";
import { PublicHeader } from "../../../components/PublicHeader";
import { CompanyCard, CompanyKicker } from "../../../components/supply-chain/CompanyDrawer";
import { ClusterCard } from "./ClusterCard";
import { CompanyTable } from "../../../components/supply-chain/CompanyTable";
import { FootnotesProvider } from "../../../components/supply-chain/footnotes";
import { SourcesSection } from "../../../components/supply-chain/SourcesSection";
import { LinkSummary } from "./LinkSummary";
import { RegionPicker } from "./RegionPicker";
import { StageStrip } from "./StageStrip";
import { drillLevel, popPatch, useCountryState } from "./url-state";
import "../../tools.css";
import "../../../components/supply-chain/supply-chain.css";
import "./country.css";

// One country of the supply-chain atlas (/japan, ...): the overview strip,
// then a map of every company's headquarters and plants by segment, with
// supply arcs (those leaving the country end in a chip that links to that
// country's page once live), named clusters to zoom to, the company card in
// a drawer (a bottom sheet on phones) and the company table. Segment,
// company, site, cluster and region live in the URL.
//
// A busy country (more links or sites than below) opens calm: its sites
// gather into regional hubs (when the page names them) until the map is
// zoomed in, single sites are named once zoomed, and links draw once a
// company, site or region is chosen.
//
// A page with regions (/us: states) zooms to one when its outline or its
// entry in the picker is chosen: the map, links and table narrow to it.
const BUSY_LINKS = 45;
const BUSY_SITES = 100;
export function CountryPage({ page, menuOpen = false, topology }: {
    page: CountryPageData;
    menuOpen?: boolean;
    // Preloaded admin-1 outlines (tests); the map fetches them otherwise.
    topology?: MapTopology;
}) {
    const state = useCountryState();
    const mapRef = useRef<HTMLElement>(null);
    const [mapWidth, setMapWidth] = useState(1000);
    useEffect(() => {
        const el = mapRef.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver(() => setMapWidth(el.clientWidth || 1000));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const title = `${page.name}: actuator supply chain`;
    useEffect(() => {
        const prev = document.title;
        document.title = title;
        return () => { document.title = prev; };
    }, [title]);
    const data = useMemo(() => {
        const sites = countrySites(page.code);
        return {
            companies: countryCompanies(page.code),
            sites,
            pins: sitePins(sites),
            arcs: supplyArcs(countryLinks(page.code)),
        };
    }, [page.code]);
    const segment = state.segment;
    const pins = segment ? data.pins.filter((p) => p.segment === segment) : data.pins;
    const region = page.regions?.list.find((r) => r.code === state.region) ?? null;
    const shown = region ? pins.filter((p) => p.admin1 === region.name) : pins;
    const inRegion = region ? new Set(shown.flatMap((p) => p.companyId ?? [])) : null;
    const inCluster = state.cluster ? page.clusters.find((c) => c.id === state.cluster) : undefined;
    const clusterIds = inCluster ? new Set(clusterSites(inCluster, countrySites(page.code)).map((s) => s.companyId)) : null;
    const companies = data.companies.filter((c) => (!segment || c.segment === segment) && (!inRegion || inRegion.has(c.id)) && (!clusterIds || clusterIds.has(c.id)));
    const siteCount = (id: string) => data.sites.filter((s) => s.companyId === id && (!region || s.admin1 === region.name)).length;
    const inCountry = (id: string | null) => id !== null && data.companies.some((c) => c.id === id);
    // Only this country's companies open a drawer; their sites may be abroad
    // (the drawer lists every site of the company).
    const company = inCountry(state.company) ? state.company : null;
    const site = state.site
        ? (data.sites.find((s) => s.id === state.site)
            ?? (company ? sitesOf(company).find((s) => s.id === state.site) : undefined)
            ?? null)
        : null;
    const companyId = site?.companyId ?? company;
    const busy = data.arcs.length > BUSY_LINKS || data.sites.length > BUSY_SITES;
    const touches = (ids: (id: string) => boolean) => data.arcs.filter((a) => ids(a.from.id) || ids(a.to.id));
    const regions = page.regions;
    // The region code of a domestic arc end ("CA"), for chips and the links
    // summary.
    const regionOf = (end: MapArcEnd) => (end.country === page.code ? regions?.list.find((r) => r.name === end.admin1)?.code : undefined);
    // A region opens on its sites alone; its links draw from the summary
    // under the map (hovered or picked) or once a company is chosen.
    // Links in and out of the region: arcs anchor at a company's head office,
    // so those are the links with an end there.
    const inside = (end: MapArcEnd) => !!region && end.country === page.code && end.admin1 === region.name;
    const regionArcs = region ? data.arcs.filter((a) => inside(a.from) || inside(a.to)) : [];
    // The partner place hovered or picked in the summary, kept per region
    // so a new region starts with none.
    const [link, setLink] = useState<{ region: string; hover: string | null; pin: string | null } | null>(null);
    const here = link && link.region === region?.code ? link : null;
    const linkKey = here?.hover ?? null;
    const linkPin = here?.pin ?? null;
    const setLinkKey = (hover: string | null) => region && setLink({ region: region.code, hover, pin: linkPin });
    const setLinkPin = (pin: string | null) => region && setLink({ region: region.code, hover: linkKey, pin });
    const partnerKey = (a: MapArc) => {
        const inFrom = inside(a.from);
        const inTo = inside(a.to);
        if (inFrom && inTo) return "within";
        const far = inFrom ? a.to : a.from;
        return regionOf(far) ?? far.country;
    };
    const linkFocus = linkKey ?? linkPin;
    const cluster = page.clusters.find((c) => c.id === state.cluster) ?? null;
    const members = cluster ? [...new Set(clusterSites(cluster, data.sites).map((s) => s.companyId))] : [];
    // The map is a drill-down: country (calm: hubs, no links), then a
    // cluster (its companies and their links), a company (its sites and
    // links) and a site. A deep link to a company infers its cluster for
    // the breadcrumb and for stepping back.
    const level = drillLevel({ ...state, company });
    const companySites = companyId ? data.sites.filter((s) => s.companyId === companyId) : [];
    const crumbCluster = cluster
        ?? (companyId ? page.clusters.find((c) => (site && site.country === page.code ? [site] : companySites).some((s) => insideCluster(c, s))) ?? null : null);
    const arcs = companyId ? touches((id) => id === companyId)
        : inRegion ? (linkFocus ? regionArcs.filter((a) => partnerKey(a) === linkFocus) : [])
            : cluster ? touches((id) => members.includes(id))
                : [];
    const selectedPin = shown.find((p) => p.id === site?.id)?.id ?? shown.find((p) => p.companyId === companyId)?.id ?? null;
    const onMap = (id: string) => data.sites.some((s) => s.companyId === id);
    const top = !region && !cluster && !companyId;
    const hubs = !top ? undefined
        : busy && page.hubs
            ? page.hubs.map((h) => ({ id: h.id, label: h.label, has: (p: { admin1?: string }) => h.regions.includes(p.admin1 ?? "") }))
            : page.clusters.map((c) => ({ id: c.id, label: c.label, has: (p: { lat: number; lon: number }) => insideCluster(c, p) }));
    const isCluster = (id: string) => page.clusters.some((c) => c.id === id);
    // The drawer covers the map's right side on wide screens; zooms keep the
    // selection clear of it.
    const inset = mapWidth > 600 ? Math.min(0.45, 320 / mapWidth) : 0;
    const focus = level === 3 && site && site.country === page.code
        ? { id: `site:${site.id}`, points: [site], maxK: 12 }
        : level >= 2 && companySites.length
            ? { id: `company:${companyId}`, points: companySites, maxK: 10 }
            : cluster
                ? { id: `cluster:${cluster.id}`, points: [{ lat: cluster.bbox[0], lon: cluster.bbox[1] }, { lat: cluster.bbox[2], lon: cluster.bbox[3] }], maxK: 12 }
                : { id: null, points: [], maxK: 1 };
    const goTop = () => state.set({ cluster: null, region: null, company: null, site: null });
    const toCluster = (id: string) => state.set({ cluster: id, region: null, company: null, site: null });
    const back = () => state.set(level === 2 && !cluster && crumbCluster ? { company: null, site: null, cluster: crumbCluster.id } : popPatch({ ...state, company }));
    const crumbs = [
        { label: page.name, onSelect: goTop },
        ...(companyId && crumbCluster ? [{ label: crumbCluster.label, onSelect: () => toCluster(crumbCluster.id) }] : []),
    ];
    // Outline ids ("US-TX") of the regions holding a shown site.
    const regionIds = new Set(pins.flatMap((p) => {
        const r = regions?.list.find((x) => x.name === p.admin1);
        return r ? [`${page.code}-${r.code}`] : [];
    }));
    const set = state.set;
    const toRegion = (code: string | null) => state.set({ region: code, cluster: null, company: null, site: null });
    // Escape steps back out of a region once no company card is open (the
    // card takes the first Escape).
    useEffect(() => {
        if (!region || companyId) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") set({ region: null }); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [region, companyId, set]);
    const where = region ? region.name : page.name;
    return <div className="tool-page cp-page">
        <PublicHeader path={page.path} initialOpen={menuOpen} />
        <FootnotesProvider>
            <main className="tool-main">
                <header className="tool-head cp-head">
                    <p className="tool-kicker">Supply chain · as of {COUNTRY_AS_OF}</p>
                    <h1>{title}</h1>
                    <p className="tool-lede">{page.lede}</p>
                    <a className="cp-cta" href={`/api/v1/countries/${page.code}`}>Get the data</a>
                </header>

                <StageStrip page={page} />

                <div className="cp-controls">
                    <div className="cp-filter" role="radiogroup" aria-label="Segment">
                        <button type="button" role="radio" aria-checked={!segment} onClick={() => state.set({ segment: null })}>All <b>{data.companies.length}</b></button>
                        {SEGMENTS.map((s) => <button key={s} type="button" role="radio" aria-checked={segment === s} title={SEGMENT_LABEL[s]}
                            onClick={() => state.set({ segment: s, company: null, site: null })}>
                            <SegmentTile segment={s} size={14} />{SEGMENT_SHORT[s]} <b>{data.companies.filter((c) => c.segment === s).length}</b>
                        </button>)}
                    </div>
                    {regions ? <RegionPicker regions={regions} pins={pins} selected={region?.code ?? null} onSelect={toRegion} /> : null}
                </div>

                <section ref={mapRef} className="cp-mapwrap" aria-label={`Map of ${page.name}`}>
                    <CountryMap code={page.code} label={`${where}: company headquarters and plants`} sites={pins} topology={topology}
                        regions={regions ? {
                            selected: region ? `${page.code}-${region.code}` : null,
                            selectable: (id) => regionIds.has(id),
                            onSelect: (id) => {
                                const code = id ? id.slice(page.code.length + 1) : null;
                                toRegion(code === region?.code ? null : code);
                            },
                            keepZoom: !!state.cluster,
                        } : undefined}
                        toggle={region ? <button type="button" className="cp-back" onClick={() => toRegion(null)}>
                            <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M8 5H2M5 2 2 5l3 3" /></svg>All {regions?.plural}
                        </button> : undefined}>
                        <Arcs arcs={arcs} regionOf={regions ? regionOf : undefined} onRegion={regions ? (code) => toRegion(code) : undefined} />
                        <ClusterZoom
                            pins={shown}
                            clusters={page.clusters}
                            activeCluster={state.cluster}
                            onCluster={(id) => state.set({ cluster: id, region: null })}
                            selectedId={selectedPin}
                            onSelect={(p) => state.set({ site: p.id, company: p.companyId ?? null })}
                            table={`${where} sites`}
                            labels={busy && !region ? "zoomed" : true}
                            hubs={hubs}
                            onHub={(id) => (isCluster(id) ? toCluster(id) : undefined)}
                            inset={inset}
                            boxes={!region}
                        />
                        <SelectionFocus id={focus.id} points={focus.points} maxK={focus.maxK} inset={inset} />
                    </CountryMap>
                    {companyId || cluster ? <MapDrawer
                        open
                        title={companyId ? (getCompany(companyId)?.name ?? companyId) : (cluster?.label ?? "")}
                        kicker={companyId ? <CompanyKicker companyId={companyId} country={page.code} /> : `${members.length} companies`}
                        crumbs={crumbs}
                        onBack={back}
                        onClose={goTop}
                    >
                        <div className="mk-level" key={companyId ?? cluster?.id}>
                            {companyId ? <CompanyCard
                                companyId={companyId}
                                siteId={site?.id ?? null}
                                country={page.code}
                                onSelectSite={(id) => state.set({ site: id === site?.id ? null : id, company: companyId })}
                                onSelectCompany={(id) => state.set({ company: id, site: null })}
                                onMap={onMap}
                            /> : cluster ? <ClusterCard
                                cluster={cluster}
                                members={members}
                                pins={pins.filter((p) => insideCluster(cluster, p))}
                                onCompany={(id) => state.set({ company: id, site: null })}
                            /> : null}
                        </div>
                    </MapDrawer> : null}
                </section>

                {region && inRegion && !companyId && regionArcs.length ? <LinkSummary
                    arcs={regionArcs}
                    keyOf={partnerKey}
                    inside={inside}
                    region={region}
                    regionOf={regionOf}
                    active={linkFocus}
                    pinned={linkPin}
                    onHover={setLinkKey}
                    onPin={(k) => setLinkPin(k === linkPin ? null : k)}
                /> : null}

                <Fold
                    key={cluster?.id ?? region?.code ?? "all"}
                    className="cp-companies"
                    title={cluster ? `Companies in ${cluster.label}` : region ? `Companies in ${region.name}` : "All companies"}
                    count={companies.length}
                    headline={<SegmentMix mix={segmentMix(companies)} size={12} layout="row" />}
                    defaultOpen={!!cluster || !!region}
                >
                    <CompanyTable
                        companies={companies}
                        sitesOf={siteCount}
                        sitesLabel={`Sites in ${where}`}
                        selectedId={companyId}
                        onSelect={(id) => {
                            state.set({ company: id, site: null });
                            mapRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
                        }}
                        caption={region
                            ? `${companies.length} companies${segment ? `: ${SEGMENT_LABEL[segment]}` : ""} with a site in ${region.name}`
                            : `${companies.length} companies${segment ? `: ${SEGMENT_LABEL[segment]}` : ""}, headquartered in ${page.name} or with a site there`}
                    />

                </Fold>

                <SourcesSection />
            </main>
        </FootnotesProvider>
        <PublicFooter />
    </div>;
}
