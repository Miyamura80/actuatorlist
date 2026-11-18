import "./happydom";
import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { FUNDS } from "../../src/investors";
import { Investors } from "../src/pages/Investors";

afterEach(cleanup);

const fundButton = (root: HTMLElement, name: string) =>
    root.querySelector(`[role="button"][aria-label^="${name}:"]`) as HTMLElement | null;

test("a fund row opens inline to its deal chips by click and by keyboard", () => {
    const c = render(<Investors />).container;
    const fund = FUNDS.find((f) => f.deals.length > 1);
    if (!fund) throw new Error("no fund with deals");
    const btn = fundButton(c, fund.name);
    expect(btn?.getAttribute("aria-expanded")).toBe("false");
    expect(c.querySelector(`[aria-label="${fund.name} deals"]`)).toBeNull();
    fireEvent.click(btn as HTMLElement);
    expect(btn?.getAttribute("aria-expanded")).toBe("true");
    const chips = c.querySelectorAll(`[aria-label="${fund.name} deals"] .inv-chip`);
    expect(chips).toHaveLength(fund.deals.length);
    if (fund.deals.some((d) => d.lead)) expect(c.querySelector(`[aria-label="${fund.name} deals"] .inv-lead`)?.textContent).toBe("LEAD");
    fireEvent.keyDown(btn as HTMLElement, { key: "Enter" });
    expect(btn?.getAttribute("aria-expanded")).toBe("false");
});

test("kind toggles replace the preset row and the deals table sits in a closed fold", () => {
    const c = render(<Investors />).container;
    expect(c.querySelector(".inv-presets")).toBeNull();
    expect(c.querySelector(".inv-in")).toBeNull();
    const toggles = [...c.querySelectorAll<HTMLButtonElement>(".inv-key button")];
    expect(toggles).toHaveLength(3);
    fireEvent.click(toggles[0] as HTMLButtonElement);
    expect(toggles[0]?.getAttribute("aria-pressed")).toBe("false");
    const table = c.querySelector(".inv-table table");
    expect(table).not.toBeNull();
    expect((table?.closest("details") as HTMLDetailsElement).open).toBe(false);
    expect(c.textContent).not.toContain("\u2014");
});
