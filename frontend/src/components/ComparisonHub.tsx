import { COMPARISON_METHOD, comparisonSnapshot, comparisonTitle } from "../../../src/catalog/comparison-registry";
import { ACTUATORS } from "../lib/data";
import { COMPARISON_PHOTO_NOTE, comparisonPhotoAlt } from "../../../src/catalog/compare";
import { CATEGORIES } from "../types";
import type { Actuator } from "../types";
import { ActuatorThumb } from "./ActuatorThumb";
import { Fold } from "./ui/Fold";

// Disclaimers shared by the directory and a picked comparison. Both views
// show them once, inside one "About these numbers" fold.
export const COMPARE_NOTES = [
    "Unknown means not documented, not zero. No winner is implied.",
    "Sensor bits are not loaded accuracy. CAD geometry is not a calibrated simulation model. Thermal duty and efficiency require matched operating conditions.",
] as const;

const categoryLabel = (slug: string) => CATEGORIES.find(category => category.slug === slug)?.label ?? slug;
const production = comparisonSnapshot(ACTUATORS);

// Open a category fold when the page is entered on (or jumps to) its fragment.
const openFold = (id: string) => {
    const details = document.getElementById(id)?.querySelector("details");
    if (details) details.open = true;
};
const hashTarget = () => (typeof window === "undefined" ? "" : window.location.hash.slice(1));

function PairThumbs({ ids, records }: { ids: readonly string[]; records: readonly Actuator[] }) {
    return (
        <span className="comparison-thumbs" aria-hidden="true">
            {ids.map(id => {
                const a = records.find(r => r.id === id);
                return a ? <span className="comparison-thumb" key={id}><ActuatorThumb actuator={a} /></span> : null;
            })}
        </span>
    );
}

export function ComparisonHub({ records = ACTUATORS }: { records?: typeof ACTUATORS }) {
    const snapshot = records === ACTUATORS ? production : comparisonSnapshot(records);
    const groups = snapshot.groups;
    const target = hashTarget();
    return <section className="comparison-hub" aria-label="Actuator comparison directory">
        {snapshot.authored.length > 0 && <h2>Engineering comparison</h2>}
        {snapshot.authored.map(pair => <article className="comparison-feature" key={pair.path}>
            <h3><a href={pair.path}>{pair.title}</a></h3>
            <div className="comparison-feature-photos">{pair.ids.map(id => {
                const a = records.find(a => a.id === id);
                if (!a) return null;
                return <a href={`/actuators/${id}`} key={id}>
                    {a.image_url ? <img src={a.image_url} alt={comparisonPhotoAlt(a)} width={320} height={320} loading="lazy" /> : <ActuatorThumb actuator={a} />}
                    <span>{a.name}</span>
                </a>;
            })}</div>
        </article>)}
        <nav className="comparison-jump" aria-label="Comparison drive categories">{groups.map(group => <a href={`#compare-${group.category}`} key={group.category} onClick={() => openFold(`compare-${group.category}`)}>{categoryLabel(group.category)}</a>)}</nav>
        {groups.map(group => <section id={`compare-${group.category}`} tabIndex={-1} key={group.category}>
            <Fold title={categoryLabel(group.category)} count={group.pairs.length} defaultOpen={target === `compare-${group.category}`}>
                <ul className="comparison-links">{group.pairs.map(pair => <li key={pair.path}>
                    <a href={pair.path}>
                        <PairThumbs ids={pair.ids} records={records} />
                        <span className="comparison-pair-title">{comparisonTitle(pair, records)}</span>
                    </a>
                </li>)}</ul>
            </Fold>
        </section>)}
        <Fold title="About these numbers" className="comparison-about">
            {COMPARE_NOTES.map(note => <p key={note}>{note}</p>)}
            <p>{COMPARISON_PHOTO_NOTE}</p>
            {snapshot.authored.length > 0 && <p>Engineering comparisons review documentation, revision conflicts and explicit unknowns. They are not matched bench tests.</p>}
            <h3>How pairs are selected</h3>
            <p>{COMPARISON_METHOD}</p>
            <a href="/guides/robot-actuator-selection">Actuator selection guide</a>
        </Fold>
    </section>;
}
