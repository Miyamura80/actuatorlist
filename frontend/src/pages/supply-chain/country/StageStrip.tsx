import { type CountryPage, worldShares } from "../../../../../src/supply-chain/country-pages";
import { MEASURE_TYPE_LABEL, measuresForCountry } from "../../../../../src/supply-chain/policy";
import { STAGE_LABEL } from "../../../../../src/supply-chain/stages";
import { NodeBadge } from "../../../components/flows/NodeBadge";
import { FootnoteRef, SourcedValue } from "../../../components/supply-chain/SourcedValue";
import { SUPPLY_CHAIN_AS_OF } from "../../../../../src/supply-chain/registry";

const POLICY_CHIPS = 6;

// The overview strip above the map: the country's share of each stage, a
// bar for the share and the world leader's badge (one country holding half
// or more reads as dominant), then the country's newest policy measures.
export function StageStrip({ page }: { page: CountryPage }) {
    const policies = measuresForCountry(page.code);
    return <div className="cp-strip">
        <ol className="cp-stages" aria-label={`${page.name}'s share of each stage`}>
            {page.stages.map((s) => {
                const world = worldShares(s.stage);
                return <li key={s.stage} className="cp-stage" data-stage={s.stage}>
                    <span className="cp-stage-name"><StageIcon stage={s.stage} />{STAGE_LABEL[s.stage]}</span>
                    <span className="cp-stage-share">
                        {s.share ? <SourcedValue value={s.share} /> : <span className="cp-gap">no split<FootnoteRef sources={s.gap?.sources ?? []} asOf={SUPPLY_CHAIN_AS_OF} confidence="reported" note={s.gap?.text} /></span>}
                    </span>
                    <span className="cp-stage-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (s.share?.value ?? 0) * 100)}%` }} /></span>
                    <details className="cp-stage-more">
                        <summary aria-label={`About ${STAGE_LABEL[s.stage]}`}>of {s.of.split(" ").slice(0, 3).join(" ")}…</summary>
                        <span className="cp-stage-of">of {s.of}</span>
                        {world ? <span className="cp-stage-world">World leader <NodeBadge kind="concentration" shares={world} /></span> : null}
                    </details>
                </li>;
            })}
        </ol>
        {policies.length ? <details className="cp-policies">
            <summary><span className="cp-policies-label">Policy</span>{policies.length} measures</summary>
            <div className="cp-policies-list">
                {policies.slice(0, POLICY_CHIPS).map((m) => <a key={m.id} className="cp-policy" href={`/policy#measure=${m.id}`} title={`${MEASURE_TYPE_LABEL[m.type]}: ${m.summary}`}>{m.title}</a>)}
                <a className="cp-policy is-more" href="/policy">All {policies.length} on /policy</a>
            </div>
        </details> : null}
    </div>;
}

// One pictogram per stage, so the strip reads as a chain: ore, separation,
// magnet, gear, robot arm.
const STAGE_ICON: Record<string, string> = {
    mining: "M2 13l4-7 3 4 2-3 3 6z",
    separation: "M6 2h4M7 2v4l-4 7h10l-4-7V2",
    magnet: "M4 3v6a4 4 0 008 0V3M4 6h2M10 6h2",
    gearing: "M8 5a3 3 0 110 6 3 3 0 010-6zM8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13",
    robot: "M3 14h6M6 14V9l4-4 3 2M10 5l-1-2",
};

function StageIcon({ stage }: { stage: string }) {
    const d = STAGE_ICON[stage];
    if (!d) return null;
    return <svg className="cp-stage-icon" viewBox="0 0 16 16" aria-hidden="true"><path d={d} /></svg>;
}
