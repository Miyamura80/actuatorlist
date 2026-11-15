import "./happydom";
import { afterEach, expect, test } from "bun:test";
import { FOLD_SCRIPT } from "../../src/server/agent/html/body";

afterEach(() => {
    document.body.innerHTML = "";
});

function setUrl(url: string) {
    (window as unknown as { happyDOM: { setURL: (u: string) => void } }).happyDOM.setURL(url);
}

// The server's persistent section, folded: an outer fold, sections inside.
function mount() {
    document.body.innerHTML = `
        <a id="how" href="#catalog-content">How the calculation works</a>
        <a id="to-knee" href="#knee">Knee</a>
        <section id="catalog-content"><div class="ga-main">
            <details class="ga-fold ga-fold-outer" id="data-tables"><summary>Data</summary><div class="ga-fold-body">
                <details class="ga-fold" id="fold-method"><summary><h2>Method</h2></summary><div class="ga-fold-body"><p>M</p></div></details>
                <details class="ga-fold" id="joint-knee"><summary><h2 id="knee">Knee</h2></summary><div class="ga-fold-body"><p>K</p></div></details>
            </div></details>
        </div></section>`;
    new Function(FOLD_SCRIPT)();
    const el = (id: string) => document.getElementById(id) as HTMLDetailsElement;
    return { outer: el("data-tables"), method: el("fold-method"), knee: el("joint-knee") };
}

test("a link to the section opens its first fold and the folds around it", () => {
    setUrl("http://localhost/tools/x");
    const { outer, method, knee } = mount();
    expect([outer.open, method.open, knee.open]).toEqual([false, false, false]);
    (document.getElementById("how") as HTMLAnchorElement).click();
    expect([outer.open, method.open, knee.open]).toEqual([true, true, false]);
});

test("a link to a heading inside a fold opens that fold", () => {
    setUrl("http://localhost/tools/x");
    const { outer, method, knee } = mount();
    (document.getElementById("to-knee") as HTMLAnchorElement).click();
    expect([outer.open, method.open, knee.open]).toEqual([true, false, true]);
});

test("a hash in the URL opens its fold on load", () => {
    setUrl("http://localhost/guides/x#joint-knee");
    const { outer, knee } = mount();
    expect([outer.open, knee.open]).toEqual([true, true]);
});
