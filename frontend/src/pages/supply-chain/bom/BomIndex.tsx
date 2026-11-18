import { useEffect, useMemo } from "react";
import { BOM_AS_OF, BOM_CASES, BOM_PATH, bomCasePath, caseWithMaker, caseWithNode } from "../../../../../src/supply-chain/bom";
import { idiotText } from "../../../../../src/supply-chain/bom/format";
import { heroOf, usesOf } from "../../../../../src/supply-chain/bom/used-in";
import { ValueSankey } from "../../../components/flows/ValueSankey";
import { PublicFooter } from "../../../components/PublicFooter";
import { PublicHeader } from "../../../components/PublicHeader";
import { FootnotesProvider } from "../../../components/supply-chain/footnotes";
import { SourcedValue } from "../../../components/supply-chain/SourcedValue";
import { SourcesSection } from "../../../components/supply-chain/SourcesSection";
import { Fold } from "../../../components/ui/Fold";
import { readSelection } from "../../../lib/supply-chain-selection";
import { BomHeroImage, CardUsedIn } from "./BomUses";
import { MarginBar } from "./MarginBar";
import { caseModel, topSankey } from "./model";
import { money, usdText } from "./PartPanel";

const TITLE = "What an actuator is really made of";

// Compare sankeys share one scale: the priciest case gets FLOW_H pixels and
// the rest shrink with their price, down to a floor that keeps labels legible.
// Below the floor, valueMax shrinks the bands to the same pixels per dollar.
const FLOW_H = 320;
const FLOW_MIN_H = 150;
function flowHeight(price: number, max: number): { height: number; valueMax: number } {
    const height = Math.round(Math.max(FLOW_MIN_H, (FLOW_H * price) / max));
    return { height, valueMax: (max * height) / FLOW_H };
}

// /bom: the three teardowns side by side. #node=<id> (the link from a
// /manufacturing step) forwards to the first case with that node, and
// ?company=<id> (the company drawer's link) to the first node it makes.
export function BomIndex({ menuOpen }: { menuOpen: boolean }) {
    const models = useMemo(() => BOM_CASES.map(caseModel), []);
    useEffect(() => {
        const node = readSelection(window.location.hash, "node");
        const c = node ? caseWithNode(node) : undefined;
        if (c && node) {
            window.location.replace(`${bomCasePath(c.slug)}#node=${encodeURIComponent(node)}`);
            return;
        }
        const company = new URLSearchParams(window.location.search).get("company");
        const made = company ? caseWithMaker(company) : undefined;
        if (made) window.location.replace(`${bomCasePath(made.c.slug)}#node=${encodeURIComponent(made.nodeId)}`);
    }, []);
    useEffect(() => {
        const prev = document.title;
        document.title = "Bill of materials";
        return () => { document.title = prev; };
    }, []);
    const max = Math.max(...BOM_CASES.map((c) => c.price.value));
    return <div className="tool-page bm-page">
        <PublicHeader path={BOM_PATH} initialOpen={menuOpen} />
        <FootnotesProvider>
            <main className="tool-main">
                <header className="tool-head bm-head">
                    <p className="tool-kicker">Supply chain · Bill of materials · as of {BOM_AS_OF}</p>
                    <h1>{TITLE}</h1>
                    <p className="tool-lede">Three actuators, part by part: cost, metal, maker.</p>
                    <a className="bm-cta cta-primary" href="/api/v1/bom">Get the data</a>
                </header>
                <ol className="bm-grid">
                    {models.map(({ c, metrics }) => {
                        const root = metrics.get(c.root.id);
                        const uses = usesOf(c);
                        const hero = heroOf(c, uses);
                        return <li key={c.slug} className="bm-card">
                            <BomHeroImage hero={{ ...hero, href: bomCasePath(c.slug) }} />
                            <a className="bm-card-link" href={bomCasePath(c.slug)}>
                                <span className="bm-card-kicker">{c.short}</span>
                                <span className="bm-card-name">{c.name}</span>
                            </a>
                            <p className="bm-card-idiot" aria-label={`Idiot index ${root?.idiot ? idiotText(root.idiot) : "n/a"}`}>
                                <b className="bm-idiot">{root?.idiot ? idiotText(root.idiot) : "n/a"}</b>
                                <span>idiot index</span>
                            </p>
                            <MarginBar c={c} compact />
                            <Fold className="bm-card-more" title="Price and robots"
                                headline={<SourcedValue value={c.price} format={usdText} />}>
                                <dl className="bm-stats is-card">
                                    <div><dt>Price</dt><dd><SourcedValue value={c.price} format={usdText} /></dd></div>
                                    <div><dt>Raw material</dt><dd><span className="sc-num">{money(root?.raw ?? 0)}</span></dd></div>
                                </dl>
                                <p className="bm-card-take">{c.takeaway}</p>
                                <CardUsedIn uses={uses} />
                            </Fold>
                        </li>;
                    })}
                </ol>
                <section className="bm-sec-block" aria-labelledby="bm-compare-h">
                    <h2 id="bm-compare-h">Flows at one scale</h2>
                    <p className="bm-sub">Height follows price.</p>
                    <div className="bm-compare" id="bm-compare">
                        {models.map((m) => {
                            const f = topSankey(m);
                            const size = flowHeight(m.c.price.value, max);
                            return <div key={m.c.slug} className="bm-compare-one">
                                <h3><a href={bomCasePath(m.c.slug)}>{m.c.short}</a></h3>
                                <ValueSankey nodes={f.nodes} links={f.links} label={m.c.name} format={money}
                                    valueMax={size.valueMax} height={size.height} orientation="horizontal" />
                            </div>;
                        })}
                    </div>
                </section>
                <details className="bm-method">
                    <summary>How to read this</summary>
                    <ul>
                        <li><b>Idiot index</b> The price over the cost of the raw material inside: Musk's test for how much a part is marked up over its metal.</li>
                        <li><b>Who keeps the price</b> Each named or typical maker's gross profit on what it sells into the actuator. The rest pays for labour, energy, machines and margins we cannot name.</li>
                        <li><b>Estimates</b> Most part costs are models from published shares of an actuator's cost, and bought-in chips use distributor prices for comparable parts; every figure links to its source.</li>
                        <li><b>Pictures</b> The actuator's own catalog photo where the site has one, else our 3D model of it. Robots that use it are named, with a photo where the catalog has one.</li>
                    </ul>
                </details>
                <p className="bm-foot"><a href={`${BOM_PATH}.md`}>Read as a table</a></p>
                <SourcesSection />
            </main>
        </FootnotesProvider>
        <PublicFooter />
    </div>;
}
