import { type ReactNode, useState } from "react";
import type { GalleryGrouping, GallerySection, GallerySize } from "../../../../src/catalog/gallery";
import type { Actuator } from "../../types";
import { num } from "../../lib/format";
import { Link } from "../../lib/router";
import { ActuatorThumb } from "../../components/ActuatorThumb";

interface Props {
    sections: GallerySection<Actuator>[];
    by: GalleryGrouping;
    picked: string[];
    pickReady: boolean;
    onPick: (id: string) => void;
    // Searching or filtering shows every match instead of the first row.
    expandAll?: boolean;
}

// Grid columns at desktop width; a "wide" or "lg" card spans two.
const ROW_UNITS = 4;
const span = (size: GallerySize) => (size === "sm" ? 1 : 2);

// How many leading cards fill the first desktop row.
function firstRowCount(sizes: GallerySize[]): number {
    let units = 0;
    let n = 0;
    for (const size of sizes) {
        if (units >= ROW_UNITS) break;
        units += span(size);
        n++;
    }
    return n;
}

export function GalleryView({ sections, by, picked, pickReady, onPick, expandAll = false }: Props) {
    let index = 0;
    return (
        <>
            {sections.map((s) => {
                const id = `${by}-${s.key}`;
                const firstRow = firstRowCount(s.cards.map((c) => c.size));
                return (
                    <GallerySectionBlock key={id} id={id} label={s.label} total={s.cards.length} firstRow={firstRow} expandAll={expandAll}>
                        {s.cards.map(({ a, size }, i) => {
                            const priority = index++ === 0;
                            const isPicked = picked.includes(a.id);
                            return (
                                <div key={a.id} className="bento-pick" data-size={size} data-extra={i >= firstRow || undefined}>
                                    <GalleryCard actuator={a} size={size} priority={priority} />
                                    <label className="pick-control" title={isPicked ? "Remove from comparison" : "Add to comparison"}>
                                        <input
                                            type="checkbox"
                                            aria-label={`Compare ${a.name}`}
                                            checked={isPicked}
                                            disabled={!pickReady || (picked.length === 4 && !isPicked)}
                                            onChange={() => onPick(a.id)}
                                        />
                                        <svg className="pick-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                                            <path d={isPicked ? "M3 8.5l3.2 3L13 4.5" : "M8 3v10M3 8h10"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </label>
                                </div>
                            );
                        })}
                    </GallerySectionBlock>
                );
            })}
        </>
    );
}

function GallerySectionBlock({
    id,
    label,
    total,
    firstRow,
    expandAll,
    children,
}: {
    id: string;
    label: string;
    total: number;
    firstRow: number;
    expandAll: boolean;
    children: ReactNode;
}) {
    // Every card stays in the DOM (prerender and SEO); extras are hidden by CSS
    // until the section is opened.
    const [open, setOpen] = useState(false);
    const hidden = total - firstRow;
    const collapsed = !open && !expandAll && hidden > 0;
    const gridId = `${id}-cards`;
    return (
        <section className="gallery-section" id={id}>
            <header className="gallery-section-head">
                <h2>
                    {label} <span>{total}</span>
                </h2>
            </header>
            <div className="bento" id={gridId} data-collapsed={collapsed}>
                {children}
            </div>
            {hidden > 0 && !expandAll && (
                <button
                    type="button"
                    className="gallery-more"
                    aria-expanded={open}
                    aria-controls={gridId}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? "Show fewer" : `Show all ${total}`}
                </button>
            )}
        </section>
    );
}

function GalleryCard({ actuator, size, priority }: { actuator: Actuator; size: GallerySize; priority: boolean }) {
    const density = actuator.torque_density_nm_per_kg;
    return (
        <Link
            to={`/actuators/${encodeURIComponent(actuator.id)}`}
            className="bento-card"
            data-size={size}
        >
            <div className="bento-thumb">
                <ActuatorThumb actuator={actuator} className="thumb-svg" priority={priority} />
            </div>
            <div className="bento-meta">
                <h3 className="bento-name">{actuator.name}</h3>
                <p className="bento-stat">
                    {density != null ? (
                        <>
                            <b>{num(density)}</b> N{"·"}m/kg
                        </>
                    ) : (
                        <>
                            <b>{num(actuator.peak_torque_nm)}</b> N{"·"}m peak
                        </>
                    )}
                </p>
            </div>
        </Link>
    );
}
