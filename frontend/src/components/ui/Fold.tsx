import type { ReactNode } from "react";

// One disclosure for every dense block: a native <details>, so keyboard and
// touch work without extra wiring. The summary carries a title plus an
// optional headline (a number or short phrase) so a closed fold still says
// something useful.
export function Fold({
    title,
    headline,
    count,
    defaultOpen = false,
    className = "",
    children,
}: {
    title: ReactNode;
    headline?: ReactNode;
    count?: number;
    defaultOpen?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <details className={`fold ${className}`} open={defaultOpen}>
            <summary className="fold-summary">
                <svg className="fold-chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                    <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <span className="fold-title">{title}</span>
                {count != null && <span className="fold-count">{count}</span>}
                {headline != null && <span className="fold-headline">{headline}</span>}
            </summary>
            <div className="fold-body">{children}</div>
        </details>
    );
}
