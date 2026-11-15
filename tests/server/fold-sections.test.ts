import { describe, expect, test } from "bun:test";
import { ARM_TORQUE_PATH } from "@/engineering/arm-torque";
import { FOLD_SCRIPT, foldOuter, foldSections } from "@/server/agent/html/body";
import { HUMANOID_GUIDE_PATH, JOINTS } from "@/server/agent/humanoid-joints";
import { MOTOR_TORQUE_PATH } from "@/server/agent/tools";
import { get } from "./agent-helpers";

const persistentOf = (html: string) =>
    /<section class="ga-page" id="catalog-content"[^>]*>[\s\S]*?<\/section>/.exec(
        html,
    )?.[0] ?? "";

// Text with tags removed, for "is it all still in the DOM" checks.
const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");

describe("foldSections", () => {
    test("each h2 and its content become one closed details, heading kept", () => {
        const html =
            '<p>Lead</p>\n<h2 id="knee">Knee</h2>\n<p>A</p>\n<h2><svg class="ga-h2-icon"><path d="M0 0"/></svg>Next steps</h2>\n<ul><li>B</li></ul>\n';
        const out = foldSections(html, {
            meta: (key) => (key === "knee" ? "69.1 N·m" : undefined),
        });
        expect(out.startsWith("<p>Lead</p>\n")).toBe(true);
        expect(out).toContain(
            '<details class="ga-fold" id="fold-knee"><summary><svg class="ga-fold-chev"',
        );
        expect(out).toContain(
            '<h2 id="knee">Knee</h2><span class="ga-fold-meta">69.1 N·m</span></summary><div class="ga-fold-body">\n<p>A</p></div></details>',
        );
        expect(out).toContain('<details class="ga-fold" id="fold-next-steps">');
        expect(out).toContain("<ul><li>B</li></ul></div></details>");
        expect(out).not.toContain(" open");
        expect(out.match(/<details/g)).toHaveLength(2);
        expect(out.match(/<\/details>/g)).toHaveLength(2);
        expect(text(out)).toContain("Knee69.1 N·m A");
    });

    test("no h2 leaves the HTML alone; foldOuter wraps everything once", () => {
        expect(foldSections("<p>x</p>")).toBe("<p>x</p>");
        const out = foldOuter("<p>x</p>", "Data tables and sources", "data-tables");
        expect(out).toMatch(
            /^<details class="ga-fold ga-fold-outer" id="data-tables"><summary>[\s\S]*Data tables and sources<\/span><\/summary>/,
        );
    });

    test("the hash script is plain inline JS with no closing script tag", () => {
        expect(FOLD_SCRIPT).not.toContain("</script");
        expect(() => new Function(FOLD_SCRIPT)).not.toThrow();
    });
});

describe("folded persistent content", () => {
    test("tool pages: every method section is a closed fold, text intact", async () => {
        for (const path of [MOTOR_TORQUE_PATH, ARM_TORQUE_PATH]) {
            const html = await (await get(path)).text();
            const persistent = persistentOf(html);
            const h2s = persistent.match(/<h2[ >]/g)?.length ?? 0;
            expect(h2s).toBeGreaterThan(3);
            expect(
                persistent.match(/<details class="ga-fold" id="fold-/g),
            ).toHaveLength(h2s);
            expect(persistent).not.toMatch(/<details class="ga-fold"[^>]* open/);
            expect(persistent).toMatch(
                /<summary><svg class="ga-fold-chev"[\s\S]*?<h2>/,
            );
            // Nested folds from the questions and examples stay inside.
            expect(persistent).toContain('<details class="ga-example');
            expect(html).toContain(`<script>${FOLD_SCRIPT}</script>`);
        }
        const motor = persistentOf(await (await get(MOTOR_TORQUE_PATH)).text());
        expect(motor).toContain(
            '<details class="ga-fold" id="fold-how-the-calculator-works">',
        );
        expect(text(motor)).toContain("Does a gearbox increase power?");
    });

    test("country pages: one outer summary line, one fold per section", async () => {
        for (const path of ["/japan", "/china", "/korea", "/us"]) {
            const html = await (await get(path)).text();
            const persistent = persistentOf(html);
            expect(persistent).toMatch(
                /<div class="ga-main"><details class="ga-fold ga-fold-outer" id="data-tables"><summary>[\s\S]*?Data tables and sources/,
            );
            for (const h of [
                "share-of-each-stage",
                "policies",
                "clusters",
                "companies",
                "sites",
                "links",
                "sources",
            ])
                expect(persistent).toContain(
                    `<details class="ga-fold" id="fold-${h}">`,
                );
            expect(persistent).not.toMatch(/<details[^>]* open/);
            expect(persistent).toContain("<table>");
            expect(html).toContain(`<script>${FOLD_SCRIPT}</script>`);
        }
    });

    test("humanoid guide: each joint is details#joint-id with its N·m", async () => {
        const html = await (await get(HUMANOID_GUIDE_PATH)).text();
        const persistent = persistentOf(html);
        for (const j of JOINTS)
            expect(persistent).toContain(
                `<details class="ga-fold" id="joint-${j.id}"><summary><svg class="ga-fold-chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M4 2l4 4-4 4"/></svg><h2 id="${j.id}">${j.name}</h2><span class="ga-fold-meta">${j.torqueNm.toFixed(1)} N·m</span></summary>`,
            );
        expect(persistent).toContain(
            '<details class="ga-fold" id="fold-how-to-read-this-guide">',
        );
        expect(html).toContain(`<script>${FOLD_SCRIPT}</script>`);
    });

    test("pages without folds ship no fold script", async () => {
        const html = await (await get("/actuators/myactuator-rmd-x8-120")).text();
        expect(html).not.toContain(FOLD_SCRIPT);
    });
});
