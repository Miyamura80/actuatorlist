import "./happydom";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { PublicHeader } from "../src/components/PublicHeader";
import { CommandPalette } from "../src/components/CommandPalette";

type HappyWindow = { happyDOM: { setViewport: (v: { width: number; height: number }) => void } };

test("search lives in the header as a 44px icon on phones, never floating over content", async () => {
    const navigation = await Bun.file(`${import.meta.dir}/../../src/public-navigation.css`).text();
    const app = (await Bun.file(`${import.meta.dir}/../src/index.css`).text()).replace(/^@import[^\n]*\n/gm, "");
    expect(app).not.toContain("cmdk-trigger");
    const style = document.createElement("style");
    style.textContent = `${navigation}\n${app}`;
    const host = document.createElement("div");
    host.innerHTML = renderToString(<><PublicHeader path="/" /><CommandPalette /></>);
    document.head.append(style);
    document.body.append(host);
    const happy = (window as unknown as HappyWindow).happyDOM;
    try {
        const search = host.querySelector<HTMLElement>("header > a.site-search")!;
        happy.setViewport({ width: 390, height: 844 });
        expect(getComputedStyle(search).width).toBe("44px");
        expect(getComputedStyle(search).height).toBe("44px");
        expect(getComputedStyle(search).position).not.toBe("fixed");
        // A closed palette renders nothing.
        expect(host.querySelectorAll("header ~ *")).toHaveLength(0);
    } finally {
        style.remove();
        host.remove();
        happy.setViewport({ width: 1024, height: 768 });
    }
});
