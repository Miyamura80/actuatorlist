import { type ReactNode, useEffect, useRef } from "react";

// The panel a map selection opens: beside the map on wide screens, a bottom
// sheet on phones. Escape or the close button clears the selection. Pages put
// their own content in it (CompanyDrawer, SiteDetail).
//
// A drill-down (country > cluster > company > site) passes `crumbs`, the
// levels above this one, and `onBack`: Escape then steps up one level
// instead of closing everything.
export interface Crumb {
    label: string;
    onSelect: () => void;
}

export function MapDrawer({ open, title, kicker, onClose, onBack, crumbs, children }: {
    open: boolean;
    title: string;
    kicker?: ReactNode;
    onClose: () => void;
    onBack?: () => void;
    crumbs?: readonly Crumb[];
    children?: ReactNode;
}) {
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!open) return;
        ref.current?.focus({ preventScroll: true });
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") (onBack ?? onClose)(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, title, onClose, onBack]);
    if (!open) return null;
    return <aside ref={ref} className="mk-drawer" aria-label={title} tabIndex={-1}>
        <header>
            {crumbs?.length ? <nav className="mk-crumbs" aria-label="Breadcrumb">
                {crumbs.map((c) => <button key={c.label} type="button" onClick={c.onSelect}>{c.label}</button>)}
            </nav> : null}
            {kicker ? <span className="mk-drawer-kicker">{kicker}</span> : null}
            <h3>{title}</h3>
            <button type="button" className="mk-drawer-close" aria-label="Close" title="Close" onClick={onClose}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
        </header>
        <div className="mk-drawer-body">{children}</div>
    </aside>;
}
