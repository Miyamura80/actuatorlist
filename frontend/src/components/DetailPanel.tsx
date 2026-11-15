import { type ReactNode, useEffect, useRef } from "react";
import { evidenceFor, fieldCaveat } from "../../../src/catalog/evidence";
import type { Actuator } from "../types";
import { CATEGORY_MAP } from "../types";
import { bool, dash, list, num, price, voltage } from "../lib/format";
import { robotsUsingActuator } from "../lib/robots";
import { CopyLinkButton } from "./CopyLinkButton";
import { CompanyLogo } from "./CompanyLogo";
import { CountryFlag } from "./CountryFlag";
import { Fold } from "./ui/Fold";

interface Props {
    actuator: Actuator | null;
    onClose: () => void;
}

interface Spec {
    label: string;
    value: ReactNode;
}

const evidenceFields: Record<string, string> = {
    Power: "power_w",
    Weight: "weight_g", Encoder: "encoder", "Torque density": "torque_density_nm_per_kg",
    Backdrivable: "backdrivable", Backlash: "backlash_arcmin",
};

// The four numbers read first; everything else waits in folds.
function headline(a: Actuator): Spec[] {
    return [
        { label: "Peak torque", value: a.peak_torque_nm == null ? dash() : <><b>{num(a.peak_torque_nm, 1)}</b> N·m</> },
        { label: "Torque density", value: a.torque_density_nm_per_kg == null ? dash() : <><b>{num(a.torque_density_nm_per_kg, 1)}</b> N·m/kg</> },
        { label: "Weight", value: a.weight_g == null ? dash() : <><b>{num(a.weight_g)}</b> g</> },
        { label: "Price", value: <b>{price(a.price_usd)}</b> },
    ];
}

function specGroups(a: Actuator): { title: string; specs: Spec[] }[] {
    return [
        {
            title: "Mechanical",
            specs: [
                { label: "Rated torque", value: a.rated_torque_nm == null ? dash() : `${num(a.rated_torque_nm, 1)} N·m` },
                { label: "Max speed", value: a.max_speed_rpm == null ? dash() : `${num(a.max_speed_rpm)} rpm` },
                { label: "Gear ratio", value: a.gear_ratio ?? dash() },
                { label: "Backdrivable", value: bool(a.backdrivable) },
                { label: "Backlash", value: a.backlash_arcmin == null ? dash() : `${num(a.backlash_arcmin, 1)} arcmin` },
                { label: "Repeatability", value: a.repeatability_arcmin == null ? dash() : `${num(a.repeatability_arcmin, 2)} arcmin` },
            ],
        },
        {
            title: "Electrical",
            specs: [
                { label: "Voltage", value: voltage(a.voltage_v) },
                { label: "Peak current", value: a.peak_current_a == null ? dash() : `${num(a.peak_current_a, 1)} A` },
                { label: "Power", value: a.power_w == null ? dash() : `${num(a.power_w)} W` },
                { label: "Torque constant", value: a.kt_nm_per_a == null ? dash() : `${num(a.kt_nm_per_a, 3)} N·m/A` },
                { label: "Encoder", value: a.encoder ?? dash() },
            ],
        },
        {
            title: "Control",
            specs: [
                { label: "Comms", value: list(a.comm) },
                { label: "Control modes", value: list(a.control_modes) },
                { label: "Integrated driver", value: bool(a.integrated_driver) },
                { label: "IP rating", value: a.ip_rating ?? dash() },
            ],
        },
        {
            title: "Cost and origin",
            specs: [
                { label: "$ / peak N·m", value: a.price_per_nm == null ? dash() : `$${num(a.price_per_nm, 1)}` },
                { label: "Origin", value: a.country ? <CountryFlag country={a.country} /> : dash() },
            ],
        },
    ];
}

function SpecList({ a, specs, className }: { a: Actuator; specs: Spec[]; className: string }) {
    return (
        <dl className={className}>
            {specs.map((s) => {
                const caveat = fieldCaveat(a, evidenceFields[s.label] ?? s.label);
                return (
                    <div className="spec" key={s.label}>
                        <dt>{s.label}</dt>
                        <dd>{s.value}{caveat && <small style={{ display: "block" }}>{caveat}</small>}</dd>
                    </div>
                );
            })}
        </dl>
    );
}

export function DetailPanel({ actuator, onClose }: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const closeLatest = useRef(onClose);
    useEffect(() => {
        closeLatest.current = onClose;
    });
    const id = actuator?.id;
    // Focus the close button on open; Escape closes from anywhere on the page.
    useEffect(() => {
        if (!id) return;
        closeRef.current?.focus({ preventScroll: true });
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeLatest.current();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [id]);
    if (!actuator) return null;
    const a = actuator;
    const cat = CATEGORY_MAP[a.category];
    const evidence = evidenceFor(a);
    const usedIn = robotsUsingActuator(a.id);
    const evidenceClass = evidence.label.startsWith("Catalog headline specs spot-checked:") ? "verified-note" : "evidence-note";
    const notes = [...evidence.caveats, ...(a.notes ? [a.notes] : [])];
    return (
        <div className="drawer-scrim" onClick={onClose}>
            <aside
                className="drawer"
                role="dialog"
                aria-label={`${a.name} details`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="drawer-head">
                    <div>
                        <span
                            className="cat-chip"
                            style={{ ["--hue" as string]: String(cat?.hue ?? 210) }}
                        >
                            {cat?.label ?? a.category}
                        </span>
                        <h2>{a.name}</h2>
                        <p className="drawer-brand with-logo">
                            <CompanyLogo name={a.brand} size={20} />
                            {a.brand}
                        </p>
                    </div>
                    <div className="drawer-head-actions">
                        <CopyLinkButton
                            path={`/actuators/${encodeURIComponent(a.id)}`}
                            label={`Copy link to ${a.name}`}
                        />
                        <button ref={closeRef} type="button" className="drawer-close" onClick={onClose} aria-label="Close">
                            {"×"}
                        </button>
                    </div>
                </header>

                <p className={evidenceClass}>{evidence.label}</p>

                <SpecList a={a} specs={headline(a)} className="drawer-headline" />

                <div className="drawer-links">
                    {a.product_url && (
                        <a className="cta-primary" href={a.product_url} data-measure-event="manufacturer_click" data-product-id={a.id} data-measure-surface="drawer" target="_blank" rel="noopener noreferrer">
                            Product page
                        </a>
                    )}
                    {a.datasheet_url && (
                        <a href={a.datasheet_url} data-measure-event="datasheet_click" data-product-id={a.id} data-measure-surface="drawer" target="_blank" rel="noopener noreferrer">
                            Datasheet
                        </a>
                    )}
                </div>

                {specGroups(a).map((g) => (
                    <Fold key={g.title} title={g.title} count={g.specs.length}>
                        <SpecList a={a} specs={g.specs} className="spec-grid" />
                    </Fold>
                ))}

                {usedIn.length > 0 && (
                    <Fold title="Used in" count={usedIn.length}>
                        <p className="drawer-used-in">
                            {usedIn.map((r) => (
                                <a key={r.id} href={`/robots#${encodeURIComponent(r.id)}`}>
                                    {r.name}
                                </a>
                            ))}
                        </p>
                    </Fold>
                )}

                {notes.length > 0 && (
                    <Fold title="Notes" count={notes.length}>
                        {notes.map((note) => <p className="drawer-notes" key={note}>{note}</p>)}
                    </Fold>
                )}

                {a.sources?.length > 0 && (
                    <Fold title="Sources" count={a.sources.length} className="drawer-sources">
                        <ol>
                            {a.sources.map((s) => (
                                <li key={s}>
                                    <a href={s} target="_blank" rel="noopener noreferrer">
                                        {new URL(s).hostname.replace(/^www\./, "")}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </Fold>
                )}
            </aside>
        </div>
    );
}
