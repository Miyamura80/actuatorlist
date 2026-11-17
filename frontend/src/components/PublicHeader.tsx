import { useEffect, useRef } from "react";
import { PUBLIC_LINKS, SEARCH_LINK, headerMenus } from "../../../src/public-navigation";
import { CODE_LICENSE } from "../../../src/repo-link";
import { BrandMark } from "./BrandMark";
import { GitHubMark, GitHubStar } from "./GitHubMark";
import { HeaderIcon } from "./nav/HeaderIcon";
import { HeaderMenu } from "./nav/HeaderMenu";
import { openCommandPalette } from "../lib/command-palette";

export function PublicHeader({ path, initialOpen = false, supplyChainPreview = false }: { path: string; initialOpen?: boolean; supplyChainPreview?: boolean }) {
    const ref = useRef<HTMLDetailsElement>(null);
    useEffect(() => {
        const menu = ref.current!;
        const summary = menu.querySelector("summary")!;
        const sync = () => summary.setAttribute("aria-expanded", String(menu.open));
        // Read native DOM state: a visitor may open the SSR menu before hydration.
        sync();
        menu.addEventListener("toggle", sync);
        const resize = () => { if (window.innerWidth > 860) menu.open = false; };
        window.addEventListener("resize", resize);
        return () => { menu.removeEventListener("toggle", sync); window.removeEventListener("resize", resize); };
    }, []);
    return <header className="site-header">
        <a href="/" className="site-brand" aria-label="actuatorlist home">
            <BrandMark size={24} />
            <span><b>actuator</b>list.com</span><span className="site-stage">beta</span>
        </a>
        <a href={CODE_LICENSE.href} className="open-source-link"><GitHubMark /><GitHubStar />{CODE_LICENSE.label}</a>
        <a href={SEARCH_LINK.href} className="site-search" aria-label={SEARCH_LINK.label} title={SEARCH_LINK.title}
            onClick={(event) => {
                // Modified or middle clicks keep normal link behaviour (new tab, new window).
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                if (openCommandPalette()) event.preventDefault();
            }}>
            <HeaderIcon item="search" />
        </a>
        <details className="site-menu" open={initialOpen} ref={ref} onKeyDown={(event) => {
            if (event.key === "Escape" && event.currentTarget.open) {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
            }
        }}>
            <summary aria-label="Menu" aria-controls="public-navigation"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></summary>
            <nav id="public-navigation" aria-label="Site">
                {PUBLIC_LINKS.map(([href, label]) => <a key={href} href={href}
                    aria-current={path === href ? "page" : undefined}
                    onClick={() => { if (ref.current) ref.current.open = false; }}>
                    <HeaderIcon item={href} />{label}
                </a>)}
                {headerMenus(supplyChainPreview).map((menu) => <HeaderMenu key={menu.id} menu={menu} path={path} onNavigate={() => { if (ref.current) ref.current.open = false; }} />)}
            </nav>
        </details>
    </header>;
}
