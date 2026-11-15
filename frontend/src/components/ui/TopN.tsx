import { useState } from "react";
import type { ReactNode } from "react";

// Show the first `n` items; the rest wait behind one "Show all" button.
export function TopN<T>({
    items,
    n = 5,
    render,
    label = "Show all",
}: {
    items: readonly T[];
    n?: number;
    render: (item: T, index: number) => ReactNode;
    label?: string;
}) {
    const [open, setOpen] = useState(false);
    const shown = open ? items : items.slice(0, n);
    const hidden = items.length - n;
    return (
        <>
            {shown.map(render)}
            {hidden > 0 && (
                <button
                    type="button"
                    className="topn-more"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? "Show fewer" : `${label} ${items.length}`}
                </button>
            )}
        </>
    );
}
