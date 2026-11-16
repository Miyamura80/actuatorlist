import { type ReactNode, useEffect, useRef, useState } from "react";
import { Fold } from "../../../components/ui/Fold";

// A Fold whose body mounts on first open, so heavy kits (3D chunk, map
// outlines, graphs that measure themselves) load and lay out only when shown.
// The wrapper carries the id, so a hash link can find and open it.
export function LazyFold({ id, className, title, headline, count, defaultOpen = false, label, children }: {
    id?: string;
    className?: string;
    title: ReactNode;
    headline?: ReactNode;
    count?: number;
    defaultOpen?: boolean;
    label?: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLElement>(null);
    const [opened, setOpened] = useState(defaultOpen);
    useEffect(() => {
        const el = ref.current;
        const details = el?.firstElementChild;
        if (!el || !(details instanceof HTMLDetailsElement) || opened) return;
        // toggle does not bubble; a capture listener on the wrapper still sees it.
        const onToggle = (e: Event) => {
            if (e.target === details && details.open) setOpened(true);
        };
        el.addEventListener("toggle", onToggle, true);
        // Opened before this effect ran (hash link): mount on the next tick.
        if (details.open) queueMicrotask(() => setOpened(true));
        return () => el.removeEventListener("toggle", onToggle, true);
    }, [opened]);
    return <section ref={ref} id={id} className={className} aria-label={label}>
        <Fold title={title} headline={headline} count={count} defaultOpen={defaultOpen}>
            {opened ? children : null}
        </Fold>
    </section>;
}
