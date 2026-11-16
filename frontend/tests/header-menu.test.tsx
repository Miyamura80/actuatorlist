import "./happydom";
import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { PublicHeader } from "../src/components/PublicHeader";
import { CommandPalette } from "../src/components/CommandPalette";
import { MARKET_INTEL_GROUPS, SEARCH_LINK, publicHeader, supplyChainMenu } from "../../src/public-navigation";

afterEach(cleanup);

const MARKET = MARKET_INTEL_GROUPS.flatMap((g) => g.links.map(([href]) => href));
const SUPPLY = supplyChainMenu().flatMap((g) => g.links.map((l) => l.href));

test("one Explore menu groups market intel and supply chain under icon headings", () => {
    const view = render(<PublicHeader path="/patents" />);
    const menus = [...view.container.querySelectorAll(".site-sub")];
    expect(menus.map((m) => m.getAttribute("data-menu"))).toEqual(["explore"]);
    const sections = [...menus[0]!.querySelectorAll(".site-sub-panel > section")];
    expect(sections.map((s) => s.getAttribute("data-group"))).toEqual(["market-intel", "supply-chain"]);
    for (const s of sections) expect(Boolean(s.querySelector('h3 > svg.site-nav-icon[aria-hidden="true"]'))).toBe(true);
    expect([...sections[0]!.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(MARKET);
    expect([...sections[1]!.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(SUPPLY);
    expect(menus[0]!.querySelector("summary")?.className).toBe("is-current");
    expect(view.container.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe("/patents");
});

test("header keeps six or fewer top-level items", () => {
    const view = render(<PublicHeader path="/" />);
    const header = view.container.querySelector("header")!;
    const top = header.querySelectorAll(":scope > a:not(.site-brand), nav > a, nav > .site-sub");
    expect(top.length).toBeLessThanOrEqual(6);
});

test("search is a labelled header icon that opens the palette, and Cmd+K still works", async () => {
    const view = render(<><PublicHeader path="/" /><CommandPalette /></>);
    const search = view.container.querySelector<HTMLAnchorElement>("header a.site-search")!;
    expect(search.getAttribute("aria-label")).toBe(SEARCH_LINK.label);
    expect(search.getAttribute("title")).toContain("⌘K");
    expect(search.textContent).toBe("");
    expect(document.querySelector(".cmdk-trigger")).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(async () => { search.dispatchEvent(click); });
    expect(click.defaultPrevented).toBe(true);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => { fireEvent.keyDown(window, { key: "k", metaKey: true }); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => { fireEvent.keyDown(window, { key: "k", ctrlKey: true }); });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
});

test("without a mounted palette the search icon stays a plain link", () => {
    const view = render(<PublicHeader path="/" />);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    view.container.querySelector("a.site-search")!.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
});

test("server-rendered header carries the same menu and search icon", () => {
    const html = publicHeader("/");
    expect(html).toContain('data-menu="explore"');
    expect(html).not.toContain('data-menu="market-intel"');
    expect(html).toContain(`class="site-search" aria-label="${SEARCH_LINK.label}"`);
    for (const href of [...MARKET, ...SUPPLY]) expect(html).toContain(`href="${href}"`);
});
