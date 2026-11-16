import "./happydom";
import { expect, spyOn, test } from "bun:test";
import { act } from "@testing-library/react";
import type { Root } from "react-dom/client";
import captures from "./fixtures/comparisons.json";
import { mountApp } from "../src/startup";
import { ACTUATORS } from "../src/lib/data";
import { comparisonDirectory } from "../../src/catalog/comparison-registry";
import { renderToStaticMarkup } from "react-dom/server";
import { ComparisonHub } from "../src/components/ComparisonHub";

test("React authored features omit removed or renamed catalog references", () => {
    for (const records of [ACTUATORS.filter(a => a.id !== "cubemars-ak80-9"), ACTUATORS.map(a => a.id === "cubemars-ak80-9" ? { ...a, id: "renamed-ak80-9" } : a)]) {
        const html = renderToStaticMarkup(<ComparisonHub records={records} />);
        expect(html).not.toContain('class="comparison-feature"');
        expect(html).not.toContain('href="/actuators/cubemars-ak80-9"');
    }
});

test("React hub pair cards show a title and two thumbnails, never an unqualified number", () => {
    const html = renderToStaticMarkup(<ComparisonHub />);
    // Numbers live on the comparison pages, where revision conflicts are qualified.
    expect(html).not.toContain("485 g");
    expect(ACTUATORS.find(a => a.id === "cubemars-ak80-9")?.weight_g).toBe(485);
    document.body.innerHTML = html;
    const cards = [...document.querySelectorAll(".comparison-links a")];
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
        expect(card.querySelectorAll(".comparison-thumb")).toHaveLength(2);
        expect(card.querySelector(".comparison-pair-title")?.textContent).toContain(" vs ");
    }
    // Category sections start as closed folds with a count.
    const folds = [...document.querySelectorAll(".comparison-hub > section > details.fold")];
    expect(folds.length).toBeGreaterThan(0);
    expect(folds.every(f => !f.hasAttribute("open") && f.querySelector(".fold-count"))).toBe(true);
    // Disclaimers are merged into one fold.
    expect(document.querySelectorAll(".comparison-about")).toHaveLength(1);
    document.body.innerHTML = "";
});

test("React category fragments target focusable native sections", () => {
    document.body.innerHTML = renderToStaticMarkup(<ComparisonHub />);
    const links = [...document.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Comparison drive categories"] a')];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
        const target = document.querySelector<HTMLElement>(link.hash)!;
        expect(target.tagName).toBe("SECTION");
        expect(target.getAttribute("tabindex")).toBe("-1");
        target.focus();
        expect(document.activeElement === target).toBe(true);
    }
    document.body.innerHTML = "";
});

test("React hub photos visibly qualify catalog provenance", () => {
    const html = renderToStaticMarkup(<ComparisonHub />);
    expect(html).toContain("Catalog photo; illustrative. Confirm hardware revision/variant.");
    expect(html).toContain("illustrative catalog photo; revision/variant unconfirmed");
});

for (const capture of captures) {
    test(`real comparison capture ${capture.path} survives client startup with native discovery and silent restoration`, async () => {
        (window as unknown as { happyDOM: { setURL: (url: string) => void } }).happyDOM.setURL(`http://localhost${capture.path}`);
        document.body.innerHTML = `<div id="root">${capture.root}</div>`;
        const container = document.getElementById("root")!;
        const errors = spyOn(console, "error");
        const push = spyOn(window.history, "pushState");
        const replace = spyOn(window.history, "replaceState");
        const events: unknown[] = [];
        const listener = (event: Event) => events.push((event as CustomEvent).detail);
        window.addEventListener("actuatorlist:compare", listener);
        let mounted: Root | undefined;
        try {
            const selected = capture.path.includes("?");
            expect(container.querySelector(".comparison-hub") !== null).toBe(!selected);
            await act(async () => { mounted = mountApp(container); });
            expect(container.querySelector(".comparison-hub") !== null).toBe(!selected);
            if (!selected) {
                for (const pair of comparisonDirectory(ACTUATORS)) expect(container.querySelector(`.comparison-hub a[href="${pair.path}"]`) !== null).toBe(true);
                expect(container.textContent).toContain("How pairs are selected");
            } else expect(container.querySelectorAll(".compare-products > article")).toHaveLength(2);
            expect(push).not.toHaveBeenCalled();
            expect(replace).not.toHaveBeenCalled();
            expect(events).toEqual([]);
            expect(errors).not.toHaveBeenCalled();
        } finally {
            await act(async () => { mounted?.unmount(); });
            push.mockRestore(); replace.mockRestore(); errors.mockRestore();
            window.removeEventListener("actuatorlist:compare", listener);
            document.body.innerHTML = "";
        }
    });
}
