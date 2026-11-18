import type { ReactNode } from "react";
import type { BrandSummary } from "../../../../src/sdk";
import { TopN } from "../../components/ui/TopN";
import { scoreText } from "./state";

const TOP = 5;

// 1. Leaderboard: overall score under the active preset, confidence from the
// number of evidence items, and a compare toggle per brand. The brand name
// opens its profile inline; the top five show, the rest wait behind
// "Show all" (an opened brand further down stays visible).
export function SdkLeaderboard({ rows, compare, toggleCompare, open, toggleOpen, profile }: {
    rows: BrandSummary[];
    compare: string[];
    toggleCompare: (id: string) => void;
    open: string | null;
    toggleOpen: (id: string) => void;
    profile: (s: BrandSummary) => ReactNode;
}) {
    const openAt = rows.findIndex((s) => s.brand.id === open);
    return <div className="sdk-board">
        <TopN items={rows} n={Math.max(TOP, openAt + 1)} label="Show all" render={(s) => {
            const on = compare.includes(s.brand.id);
            const expanded = s.brand.id === open;
            return <div key={s.brand.id} id={`sdk-brand-${s.brand.id}`} data-brand={s.brand.id}
                className={`sdk-entry${expanded ? " is-open" : ""}`}>
                <div className="sdk-row">
                    <span className="sdk-rank">{s.rank}</span>
                    <button type="button" className="sdk-name" aria-expanded={expanded}
                        aria-controls={expanded ? `sdk-profile-${s.brand.id}` : undefined}
                        onClick={() => toggleOpen(s.brand.id)}>
                        <svg className="sdk-chev" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                            <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        </svg>
                        {s.brand.name}
                    </button>
                    <span className="sdk-bar" aria-hidden="true"><span style={{ width: `${s.score.overall}%` }} /></span>
                    <b className="sdk-score">{scoreText(s.score.overall)}</b>
                    <span className={`sdk-conf sdk-conf-${s.confidence}`} title={`${s.confidence} confidence, ${s.score.evidenceCount} evidence items`}>
                        {s.confidence} <small>{s.score.evidenceCount}</small>
                    </span>
                    <button type="button" className="sdk-pick" aria-pressed={on}
                        disabled={!on && compare.length >= 4}
                        aria-label={`${on ? "Remove" : "Add"} ${s.brand.name} ${on ? "from" : "to"} compare`}
                        onClick={() => toggleCompare(s.brand.id)}>{on ? "−" : "+"}</button>
                </div>
                {expanded ? profile(s) : null}
            </div>;
        }} />
    </div>;
}
