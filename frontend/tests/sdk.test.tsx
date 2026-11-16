import "./happydom";
import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { SCORED_BRANDS, SDK_DIMENSIONS, sdkLeaderboard } from "../../src/sdk";
import { evidenceFor } from "../../src/sdk/evidence";
import { SdkBadge } from "../src/pages/sdk/SdkBadge";
import { Sdk } from "../src/pages/sdk/Sdk";
import { frontier } from "../src/pages/sdk/ValueScatter";

const setURL = (path: string) =>
    (window as unknown as { happyDOM: { setURL: (u: string) => void } }).happyDOM.setURL(`http://localhost${path}`);

afterEach(cleanup);

test("renders every view, with the top five leaderboard rows up front", () => {
    setURL("/sdk");
    const view = render(<Sdk />);
    const c = view.container;
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe("Which actuators have the best SDK?");
    expect(c.querySelectorAll(".sdk-board .sdk-entry")).toHaveLength(Math.min(5, SCORED_BRANDS.length));
    expect(c.querySelectorAll(".sdk-heat tbody tr")).toHaveLength(SCORED_BRANDS.length);
    expect(c.querySelectorAll(".sdk-cell")).toHaveLength(SCORED_BRANDS.length * SDK_DIMENSIONS.length);
    expect(c.querySelectorAll(".sdk-radar-shape")).toHaveLength(3);
    expect(c.querySelector(".sdk-scatter")).not.toBeNull();
    expect(c.querySelectorAll(".sdk-caps tbody tr")).toHaveLength(SCORED_BRANDS.length);
    // Dense blocks sit in closed folds; nothing is expanded on arrival.
    expect([...c.querySelectorAll<HTMLDetailsElement>(".sdk-folds details.fold")].map((d) => d.open)).toEqual([false, false, false]);
    expect(c.querySelector(".sdk-profile")).toBeNull();
    expect(c.querySelectorAll("main .cta-primary")).toHaveLength(1);
});

test("Show all reveals every ranked brand", () => {
    setURL("/sdk");
    const view = render(<Sdk />);
    const c = view.container;
    const more = view.getByRole("button", { name: `Show all ${SCORED_BRANDS.length}` });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    act(() => { fireEvent.click(more); });
    expect(c.querySelectorAll(".sdk-board .sdk-entry")).toHaveLength(SCORED_BRANDS.length);
    expect(view.getByRole("button", { name: "Show fewer" }).getAttribute("aria-expanded")).toBe("true");
});

test("clicking a brand opens its profile inline and in the URL; clicking again closes it", () => {
    setURL("/sdk");
    const view = render(<Sdk />);
    const c = view.container;
    const top = sdkLeaderboard()[0];
    if (!top) throw new Error("no brands");
    const name = () => within(c.querySelector(".sdk-board") as HTMLElement).getByRole("button", { name: top.brand.name });
    expect(name().getAttribute("aria-expanded")).toBe("false");
    act(() => { fireEvent.click(name()); });
    expect(name().getAttribute("aria-expanded")).toBe("true");
    const profile = c.querySelector(`#sdk-brand-${top.brand.id} .sdk-profile`);
    expect(profile?.id).toBe(name().getAttribute("aria-controls") ?? "missing");
    expect(profile?.querySelectorAll(".sdk-dim")).toHaveLength(SDK_DIMENSIONS.length);
    expect(profile?.querySelector(".sdk-timeline, .sdk-muted")).not.toBeNull();
    expect(window.location.hash).toBe(`#brand=${top.brand.id}`);
    // A dimension bar opens its evidence inside the profile.
    act(() => { fireEvent.click(within(profile as HTMLElement).getByRole("button", { name: /^Docs and examples:/ })); });
    expect(profile?.querySelector(".sdk-panel")?.getAttribute("data-dim")).toBe("docs");
    expect(window.location.hash).toBe(`#brand=${top.brand.id}&dim=docs`);
    act(() => { fireEvent.click(name()); });
    expect(c.querySelector(".sdk-profile")).toBeNull();
    expect(window.location.hash).toBe("");
});

test("a deep link to a brand below the top five opens it without Show all", () => {
    const last = sdkLeaderboard().at(-1);
    if (!last) throw new Error("no brands");
    setURL(`/sdk#brand=${last.brand.id}`);
    const view = render(<Sdk />);
    expect(view.container.querySelector(`#sdk-brand-${last.brand.id} .sdk-profile`)).not.toBeNull();
});

test("a heatmap cell drills down to cited checks and linked posts, and lands in the URL", () => {
    setURL("/sdk");
    const view = render(<Sdk />);
    const c = view.container;
    const top = sdkLeaderboard()[0];
    if (!top) throw new Error("no brands");
    act(() => {
        fireEvent.click(view.getByRole("button", { name: new RegExp(`^${top.brand.name}, Docs and examples`) }));
    });
    const panel = c.querySelector(".sdk-panel");
    expect(panel?.getAttribute("data-brand")).toBe(top.brand.id);
    const cell = view.getByRole("button", { name: new RegExp(`^${top.brand.name}, Docs and examples`) });
    expect(cell.getAttribute("aria-controls")).toBe(panel?.id ?? "missing");
    expect(panel?.querySelectorAll(".sdk-check").length).toBeGreaterThan(0);
    expect(panel?.querySelectorAll(".sc-ref a").length).toBeGreaterThan(0);
    expect(panel?.querySelectorAll(".sdk-ev a[href^='https://']")).toHaveLength(evidenceFor(top.brand.id, "docs").length);
    expect(window.location.hash).toBe(`#brand=${top.brand.id}&dim=docs`);
    act(() => { fireEvent.click(view.getByRole("button", { name: "Close evidence" })); });
    expect(c.querySelector(".sdk-panel")).toBeNull();
});

test("presets re-rank the leaderboard and write ?preset=", () => {
    setURL("/sdk");
    const view = render(<Sdk />);
    act(() => { fireEvent.click(within(view.getByRole("group", { name: "Reader preset" })).getByRole("button", { name: "ROS 2 shop" })); });
    expect(window.location.search).toBe("?preset=ros2");
    act(() => { fireEvent.click(view.getByRole("button", { name: /^Show all/ })); });
    const names = [...view.container.querySelectorAll(".sdk-board .sdk-name")].map((n) => n.textContent);
    expect(names).toEqual(sdkLeaderboard("ros2").map((s) => s.brand.name));
});

test("compare mode holds at most four brands", () => {
    setURL("/sdk");
    const view = render(<Sdk />);
    const c = view.container;
    const adds = () => [...c.querySelectorAll<HTMLButtonElement>(".sdk-pick[aria-pressed='false']")];
    act(() => { adds()[0]?.click(); });
    expect(c.querySelectorAll(".sdk-radar-shape")).toHaveLength(4);
    expect(adds().every((b) => b.disabled)).toBe(true);
    act(() => { fireEvent.click(view.getByRole("button", { name: "Clear" })); });
    expect(c.querySelectorAll(".sdk-radar-shape")).toHaveLength(0);
});

test("a compared brand keeps its colour when another is removed", () => {
    setURL("/sdk");
    const view = render(<Sdk />);
    const c = view.container;
    const stroke = (id: string) => c.querySelector<SVGElement>(`.sdk-radar-shape[data-brand="${id}"]`)?.style.stroke;
    const [first, second, third] = sdkLeaderboard().map((s) => s.brand);
    if (!first || !second || !third) throw new Error("need three brands");
    const before = stroke(third.id);
    act(() => { fireEvent.click(view.getByRole("button", { name: `Remove ${first.name}` })); });
    expect(stroke(third.id)).toBe(before);
    expect(stroke(second.id)).not.toBe(before);
});

test("a footnote fragment survives the page's URL sync", () => {
    setURL("/sdk#sc-source-sdk-odrive-docs");
    render(<Sdk />);
    expect(window.location.hash).toBe("#sc-source-sdk-odrive-docs");
});

test("plotted brands respond to Space as well as Enter", () => {
    setURL("/sdk");
    const view = render(<Sdk />);
    const dot = view.container.querySelector<SVGGElement>(".sdk-scatter .sdk-dot");
    const id = dot?.getAttribute("data-brand");
    if (!dot || !id) throw new Error("no dot");
    expect(view.container.querySelector(".sdk-scatter svg")?.getAttribute("role")).toBe("group");
    act(() => { fireEvent.keyDown(dot, { key: " " }); });
    expect(window.location.hash).toBe(`#brand=${id}`);
});

test("SDK badge links an actuator to its brand and hides for reducers", () => {
    const badge = render(<SdkBadge actuatorId="odrive-s1" />).container.querySelector("a.sdk-badge");
    expect(badge?.getAttribute("href")).toBe("/sdk#brand=odrive");
    cleanup();
    expect(render(<SdkBadge actuatorId="nabtesco-rv-42n" />).container.innerHTML).toBe("");
    cleanup();
    expect(render(<SdkBadge actuatorId="maxon-ec-frameless-90-flat-260w" />).container.innerHTML).toBe("");
});

test("frontier keeps brands nobody beats on both price and score", () => {
    expect(frontier([
        { id: "a", x: 5, y: 50 },
        { id: "b", x: 10, y: 80 },
        { id: "c", x: 12, y: 60 },
        { id: "d", x: 4, y: 30 },
    ])).toEqual(["d", "a", "b"]);
});
