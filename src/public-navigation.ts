// Dependency-neutral navigation shared by runtime HTML and the browser build.
import {
    CODE_LICENSE,
    GITHUB_MARK_SVG,
    GITHUB_STAR_SVG,
    REPO_URL,
    isRepoHref,
} from "./repo-link";
import { LIVE_COUNTRY_PATHS } from "./supply-chain/country-pages";

// Decorative 24 × 24 outline icons for the top-level navigation.
export const HEADER_ICON_PATHS: Readonly<Record<string, string | undefined>> = {
    "/": "M8 21h8m-4-7v7M7 4h10v5c0 3-2 5-5 5s-5-2-5-5V4Zm0 2H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4",
    "/robots":
        "M12 5V2m-8 9H2m20 0h-2M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Zm4 3v2m8-2v2m-7 4h6",
    "/actuators":
        "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM10 3h4l.7 3 2 .9 2.7-1.6 2 3.4-2.1 2.1v2.4l2.1 2.1-2 3.4-2.7-1.6-2 .9-.7 3h-4l-.7-3-2-.9-2.7 1.6-2-3.4 2.1-2.1v-2.4L2.6 8.7l2-3.4 2.7 1.6 2-.9L10 3Z",
    "market-intel": "M3 3v18h18M7 15l4-4 4 2 5-7m-4 0h4v4",
    "supply-chain":
        "M9 15l6-6m-4 8-2 2a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m0-3 2-2a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0",
};

export const PUBLIC_LINKS = [
    ["/", "Leaderboard"],
    ["/robots", "Robot types"],
    ["/actuators", "Actuators"],
] as const;

// The "Supply chain" menu. Each page appears once its path is in
// SUPPLY_CHAIN_PAGES_LIVE, so the menu grows as the atlas pages merge; with
// nothing live the menu is not rendered at all.
export const SUPPLY_CHAIN_GROUPS = [
    {
        label: "Chain",
        links: [
            ["/metals", "Metals"],
            ["/policy", "Policy"],
            ["/bom", "Bill of materials"],
            ["/manufacturing", "Manufacturing"],
            ["/alts", "Alternatives"],
        ],
    },
    {
        label: "Countries",
        links: [
            ["/japan", "Japan"],
            ["/china", "China"],
            ["/korea", "Korea"],
            ["/us", "United States"],
        ],
    },
] as const;

export const SUPPLY_CHAIN_PAGES_LIVE: ReadonlySet<string> = new Set<string>([
    "/metals",
    "/policy",
    "/manufacturing",
    "/alts",
    "/bom",
    // Country pages go live when their dataset passes the coverage gate.
    ...LIVE_COUNTRY_PATHS,
]);

// The "Market intel" menu: the datasets and directories about the market
// around the catalog. Every page here is live.
export const MARKET_INTEL_GROUPS = [
    {
        label: "Data",
        links: [
            ["/benchmarks", "Measured benchmarks"],
            ["/prices", "Price history"],
            ["/trends", "Trends"],
            ["/patents", "Patents"],
        ],
    },
    {
        label: "Players",
        links: [
            ["/humanoids", "Humanoid joint map"],
            ["/startups", "Startups"],
            ["/investors", "Investors"],
            ["/people", "People"],
            ["/sdk", "SDKs"],
            ["/open-source", "Open-source robots"],
        ],
    },
] as const;

export interface SupplyChainMenuLink {
    href: string;
    label: string;
    live: boolean;
}

export interface HeaderMenuGroup {
    label: string;
    links: SupplyChainMenuLink[];
}

export interface HeaderMenu {
    id: string;
    label: string;
    groups: HeaderMenuGroup[];
}

// Menu groups with live links only, or every planned link (flagged) when
// previewing on /lab/supply-chain. Empty groups are dropped.
export function supplyChainMenu(
    preview = false,
    live: ReadonlySet<string> = SUPPLY_CHAIN_PAGES_LIVE,
): HeaderMenuGroup[] {
    return SUPPLY_CHAIN_GROUPS.map((g) => ({
        label: g.label,
        links: g.links
            .map(([href, label]) => ({ href, label, live: live.has(href) }))
            .filter((l) => preview || l.live),
    })).filter((g) => g.links.length > 0);
}

// Header dropdowns in display order; a menu with no links is dropped.
// `supplyChainPreview` lists every planned atlas page (/lab/supply-chain).
export function headerMenus(supplyChainPreview = false): HeaderMenu[] {
    const marketIntel = MARKET_INTEL_GROUPS.map((g) => ({
        label: g.label,
        links: g.links.map(([href, label]) => ({ href, label, live: true })),
    }));
    return [
        { id: "market-intel", label: "Market intel", groups: marketIntel },
        {
            id: "supply-chain",
            label: "Supply chain",
            groups: supplyChainMenu(supplyChainPreview),
        },
    ].filter((m) => m.groups.length > 0);
}

const liveSupplyChain = supplyChainMenu().flatMap((g) =>
    g.links.map((l) => [l.href, l.label] as const),
);

export const FOOTER_GROUPS = [
    {
        label: "Catalog",
        links: [...PUBLIC_LINKS, ["/compare", "Compare"]],
    },
    // Same links as the header's "Market intel" menu.
    {
        label: "Market intel",
        links: MARKET_INTEL_GROUPS.flatMap(
            (g): readonly (readonly [string, string])[] => g.links,
        ),
    },
    {
        label: "Resources",
        links: [
            ["/guides", "Engineering guides"],
            ["/guides/robot-actuator-selection", "Actuator selection"],
            ["/guides/humanoid-robot-actuators", "Humanoid actuators"],
            ["/tools/motor-torque-calculator", "Motor torque calculator"],
            ["/tools/robot-arm-torque-calculator", "Arm torque calculator"],
            ["/comparisons/cubemars-ak80-9-vs-xiaomi-cybergear", "AK80-9 vs CyberGear"],
            ["/faq", "FAQ"],
            ["/agents", "For AI agents"],
            ["/docs/api", "API documentation"],
            ["/llms.txt", "llms.txt"],
        ],
    },
    {
        label: "Project",
        links: [
            ["/about", "About"],
            ["/contributors", "Contributors"],
            ["/contact", "Contact"],
            ["/privacy", "Privacy"],
            [REPO_URL, "GitHub"],
        ],
    },
    ...(liveSupplyChain.length > 0
        ? [{ label: "Supply chain", links: liveSupplyChain }]
        : []),
] as const;

function headerIcon(item: string): string {
    const icon = HEADER_ICON_PATHS[item];
    return icon
        ? `<svg class="site-nav-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="${icon}"/></svg>`
        : "";
}

function menuHtml(menu: HeaderMenu, path: string): string {
    const current = menu.groups.some((g) => g.links.some((l) => l.href === path));
    return `<details class="site-sub" data-menu="${menu.id}"><summary${current ? ' class="is-current"' : ""}>${headerIcon(menu.id)}${menu.label}</summary><div class="site-sub-panel">${menu.groups.map((g) => `<section><h3>${g.label}</h3>${g.links.map((l) => `<a href="${l.href}"${path === l.href ? ' aria-current="page"' : ""}>${l.label}</a>`).join("")}</section>`).join("")}</div></details>`;
}

export function publicHeader(path: string): string {
    const sourceLink = `<a href="${CODE_LICENSE.href}" class="open-source-link">${GITHUB_MARK_SVG}${GITHUB_STAR_SVG}${CODE_LICENSE.label}</a>`;
    return `<header class="site-header"><a href="/" class="site-brand" aria-label="actuatorlist home"><span><b>actuator</b>list.com</span><span class="site-stage">beta</span></a>${sourceLink}<details class="site-menu"><summary aria-label="Menu" aria-controls="public-navigation"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg></summary><nav id="public-navigation" aria-label="Site">${PUBLIC_LINKS.map(([href, label]) => `<a href="${href}"${path === href ? ' aria-current="page"' : ""}>${headerIcon(href)}${label}</a>`).join("")}${headerMenus()
        .map((m) => menuHtml(m, path))
        .join("")}</nav></details></header>`;
}

export function publicFooter(): string {
    return `<footer class="site-footer"><nav aria-label="Footer">${FOOTER_GROUPS.map((group) => `<section><h2>${group.label}</h2>${group.links.map(([href, label]) => `<a href="${href}">${isRepoHref(href) ? GITHUB_MARK_SVG : ""}${label}</a>`).join("")}</section>`).join("")}</nav></footer>`;
}
