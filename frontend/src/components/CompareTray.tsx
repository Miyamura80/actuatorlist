import type { Actuator } from "../types";
import { ActuatorThumb } from "./ActuatorThumb";
import { compareEvent, compareHref } from "../lib/compare-selection";

// The tray's Compare link is the page's one primary action, so it only
// appears once there is something to compare (2+ picks).
export function CompareTray({ rows, remove, clear }: { rows: Actuator[]; remove: (id: string) => void; clear: () => void }) {
    if (!rows.length) return null;
    const ids = rows.map((a) => a.id);
    return (
        <section className="pick-tray" aria-label="Selected actuators">
            <span aria-live="polite">{rows.length < 2 ? "Pick one more" : `${rows.length}/4 picked`}</span>
            <ul>
                {rows.map((a) => (
                    <li key={a.id}>
                        <div className="pick-mini"><ActuatorThumb actuator={a} /></div>
                        <span>{a.name}</span>
                        <button
                            type="button"
                            aria-label={`Remove ${a.name}`}
                            onClick={() => {
                                remove(a.id);
                                compareEvent("update", ids.filter((id) => id !== a.id));
                            }}
                        >
                            ×
                        </button>
                    </li>
                ))}
            </ul>
            <button type="button" className="pick-clear" onClick={() => { clear(); compareEvent("update", []); }}>Clear</button>
            {rows.length >= 2 && (
                <a
                    className="cta-primary primary"
                    aria-label="Compare selected actuators"
                    href={compareHref(ids)}
                    onClick={(e) => {
                        if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) compareEvent("open", ids);
                    }}
                >
                    Compare
                </a>
            )}
        </section>
    );
}
