import { useCallback, useMemo, useState } from "react";
import { DIRECTORY, DOMAIN_LABEL, ORGS, type Org, type OrgId, PEOPLE_DOMAINS, type PeopleDomain, getDirectoryPerson, initials } from "../../../../src/people";
import { countryName } from "../../../../src/country-flag";
import { type NetNode, PERSON_RADIUS, netRadius, orgLogoOnLight, orgLogoUrl, peopleNetwork } from "../../../../src/people/views";
import { LOGO_TOKEN } from "../../lib/logo-token";
import { LABEL_FONT, placeLabels, shortName } from "./labels";

const W = 960;
const H = 620;

export type Selection = { kind: "person" | "org" | "country"; id: string } | null;

const orgOfNode = (n: NetNode) => ORGS[n.id.slice(4) as OrgId];

// People with more than one affiliation draw a little larger, like the org
// hubs, so the connectors stand out.
const personRadius = (n: NetNode) => PERSON_RADIUS + (n.degree >= 2 ? 3 : 1);
const drawnRadius = (n: NetNode) => (n.kind === "person" ? personRadius(n) : netRadius(n));
const labelText = (n: NetNode) => (n.kind === "person" ? shortName(n.label) : n.label);
// Hubs (two or more links) are named all the time, orgs first.
const isHub = (n: NetNode) => n.degree >= 2;
const hubOrder = (a: NetNode, b: NetNode) => (a.kind === b.kind ? b.degree - a.degree : a.kind === "org" ? -1 : 1);

// Org logos resolved like CompanyLogo (own file, self-hosted mark, then the
// provider when a token is set). A URL that fails to load, such as a
// provider 404, is remembered so that org falls back to its monogram.
export function useOrgLogos() {
    const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
    const url = useCallback((org: Org, size: number) => {
        const u = orgLogoUrl(org, size, LOGO_TOKEN);
        return u && !failed.has(u) ? u : null;
    }, [failed]);
    const fail = useCallback((u: string) => setFailed((s) => (s.has(u) ? s : new Set(s).add(u))), []);
    return { url, fail };
}

// Plain clicks open the panel; modifier or middle clicks keep the link's
// default, so the deep link can open in a new tab.
const isPlainClick = (e: React.MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export function DomainLegend() {
    return <ul className="pp-legend" aria-label="Domains">
        {PEOPLE_DOMAINS.map((d) => <li key={d}><i className={`pp-dot pp-${d}`} aria-hidden="true" />{DOMAIN_LABEL[d]}</li>)}
    </ul>;
}

// A logo clipped to a circle on a white disc with a neutral ring, so the
// opaque JPEG backgrounds read the same on dark and light themes. Without a
// logo the org's initials stand in.
function OrgMark({ n, logo, light, onFail }: { n: NetNode; logo: string | null; light: boolean; onFail: (url: string) => void }) {
    const r = netRadius(n);
    const clip = `pp-clip-${n.id.slice(4)}`;
    return <>
        <circle className={logo && light ? "pp-org-disc" : "pp-org-mono"} cx={n.x} cy={n.y} r={r} />
        {logo ? <>
            <clipPath id={clip}><circle cx={n.x} cy={n.y} r={r - 1} /></clipPath>
            <image href={logo} x={n.x - r * 0.82} y={n.y - r * 0.82} width={r * 1.64} height={r * 1.64} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid meet" onError={() => onFail(logo)} />
        </> : <text className="pp-org-initials" x={n.x} y={n.y} dy="0.35em" textAnchor="middle" style={{ fontSize: r * 0.62 }}>{initials(n.label)}</text>}
        <circle className="pp-org-ring" cx={n.x} cy={n.y} r={r} />
    </>;
}

// A person: their licensed headshot clipped to a disc when one is recorded,
// else a disc in their domain's colour with initials.
function PersonMark({ n }: { n: NetNode }) {
    const r = personRadius(n);
    const shot = getDirectoryPerson(n.id)?.headshot;
    const clip = `pp-clip-p-${n.id}`;
    return <>
        <circle className="pp-av" cx={n.x} cy={n.y} r={r} />
        {shot ? <>
            <clipPath id={clip}><circle cx={n.x} cy={n.y} r={r - 1.5} /></clipPath>
            <image href={shot.path} x={n.x - r} y={n.y - r} width={r * 2} height={r * 2} clipPath={`url(#${clip})`} preserveAspectRatio="xMidYMid slice" />
        </> : <text x={n.x} y={n.y} dy="0.35em" textAnchor="middle" style={{ fontSize: r * 0.78 }}>{initials(n.label)}</text>}
    </>;
}

// People linked to their organisations: solid lines for the main
// affiliation, dashed for earlier or secondary ones. Org nodes are their
// logos, people their photo or initials. Hubs are always named; any other
// node shows its name on hover or focus. Selecting a node lights it and its
// neighbours, dims the rest and opens its detail card; selecting it again,
// or the empty plot, clears it. The domain filter dims everyone else.
export function PeopleNetwork({ domain, selected, onSelect }: { domain: PeopleDomain | null; selected: Selection; onSelect: (s: Selection) => void }) {
    const { nodes, edges } = useMemo(() => peopleNetwork(W, H, DIRECTORY), []);
    const at = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
    const labels = useMemo(() => placeLabels(
        nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, r: drawnRadius(n), text: labelText(n) })),
        nodes.filter(isHub).sort(hubOrder).map((n) => n.id),
        W,
        H,
    ), [nodes]);
    const [hover, setHover] = useState<NetNode | null>(null);
    const logos = useOrgLogos();
    const selId = selected?.kind === "person" ? selected.id : selected?.kind === "org" ? `org:${selected.id}` : null;
    const lit = useMemo(() => {
        if (!selId) return null;
        const near = edges.filter((e) => e.from === selId || e.to === selId).flatMap((e) => [e.from, e.to]);
        return new Set([selId, ...near]);
    }, [selId, edges]);
    const inDomain = (n: NetNode) => {
        if (!domain) return true;
        if (n.kind === "person") return n.domain === domain;
        return edges.some((e) => e.to === n.id && at.get(e.from)?.domain === domain);
    };
    const dim = (n: NetNode) => !inDomain(n) || (lit !== null && !lit.has(n.id));
    const open = (n: NetNode) => (e: React.MouseEvent) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        const id = n.kind === "person" ? n.id : n.id.slice(4);
        if (selected?.kind === n.kind && selected.id === id) return onSelect(null);
        onSelect(n.kind === "person" ? { kind: "person", id: n.id } : { kind: "org", id: n.id.slice(4) });
    };
    const handlers = (n: NetNode) => ({
        onClick: open(n),
        onMouseEnter: () => setHover(n),
        onMouseLeave: () => setHover(null),
        onFocus: () => setHover(n),
        onBlur: () => setHover(null),
    });
    const tipOrg = hover?.kind === "org" ? orgOfNode(hover) : null;
    const tipLogo = tipOrg ? logos.url(tipOrg, 72) : null;
    return <figure className="pp-net">
        <div className="pp-net-scroll">
        <div className="pp-net-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Network of people and their organisations">
            <rect className="pp-net-bg" width={W} height={H} onClick={() => selected && onSelect(null)} />
            {edges.map((e) => {
                const a = at.get(e.from);
                const b = at.get(e.to);
                if (!a || !b) return null;
                const off = dim(a) || dim(b);
                return <line key={`${e.from}-${e.to}`} className={`pp-edge${e.main ? "" : " is-also"}${off ? " is-dim" : ""}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
            {nodes.filter((n) => n.kind === "org").map((n) => {
                const org = orgOfNode(n);
                return <a key={n.id} href={`?org=${org.id}`} className={`pp-node pp-orgnode${dim(n) ? " is-dim" : ""}${selId === n.id ? " is-on" : ""}`} aria-label={`${n.label}, ${n.degree} ${n.degree === 1 ? "person" : "people"}`} {...handlers(n)}>
                    <OrgMark n={n} logo={logos.url(org, 72)} light={orgLogoOnLight(org, logos.url(org, 72))} onFail={logos.fail} />
                </a>;
            })}
            {nodes.filter((n) => n.kind === "person").map((n) => <a key={n.id} href={`?p=${n.id}`} className={`pp-node pp-person pp-${n.domain}${dim(n) ? " is-dim" : ""}${selId === n.id ? " is-on" : ""}`} aria-label={`${n.label}, ${DOMAIN_LABEL[n.domain as PeopleDomain]}`} {...handlers(n)}>
                <PersonMark n={n} />
            </a>)}
            {/* Names sit on their own layer above every node; the links
                already carry them as accessible names. */}
            <g className="pp-labels" aria-hidden="true" style={{ fontSize: LABEL_FONT }}>
                {nodes.filter((n) => labels.always.has(n.id) || (hover?.id === n.id && n.kind === "person") || lit?.has(n.id)).map((n) => {
                    const spot = labels.spots.get(n.id);
                    if (!spot) return null;
                    const hot = hover?.id === n.id || selId === n.id;
                    return <text key={n.id} className={`pp-label${n.kind === "org" ? " is-org" : ""}${hot ? " is-hot" : ""}${dim(n) ? " is-dim" : ""}`} x={spot.x} y={spot.y} textAnchor={spot.anchor}>{labelText(n)}</text>;
                })}
            </g>
        </svg>
        {hover && tipOrg ? <div className="pp-tip" style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }} role="tooltip">
                {tipLogo ? <img className={orgLogoOnLight(tipOrg, tipLogo) ? "is-light" : ""} src={tipLogo} alt="" width={72} height={72} onError={() => logos.fail(tipLogo)} /> : <span className="pp-tip-mono" aria-hidden="true">{initials(tipOrg.name)}</span>}
                <b>{tipOrg.name}</b>
                <span>{tipOrg.country ? countryName(tipOrg.country) : ""}{` · ${hover.degree} ${hover.degree === 1 ? "person" : "people"}`}</span>
        </div> : null}
        </div>
        </div>
        <figcaption><DomainLegend /><span className="pp-dash"><svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" /></svg>earlier or secondary</span></figcaption>
    </figure>;
}
