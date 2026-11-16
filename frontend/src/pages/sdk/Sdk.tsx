import { useEffect, useMemo, useState } from "react";
import { PublicFooter } from "../../components/PublicFooter";
import { PublicHeader } from "../../components/PublicHeader";
import { FootnotesProvider } from "../../components/supply-chain/footnotes";
import { SourcesSection } from "../../components/supply-chain/SourcesSection";
import {
    DIMENSION_SHORT,
    PRESET_LABEL,
    PRESET_WEIGHTS,
    SDK_AS_OF,
    SDK_DIMENSIONS,
    SDK_METHOD,
    SDK_PATH,
    SDK_PRESETS,
    type SdkDimension,
    type SdkPreset,
    UNSCORED_BRANDS,
    sdkLeaderboard,
} from "../../../../src/sdk";
import { SDK_EVIDENCE, redditSeedNote } from "../../../../src/sdk/evidence";
import { Fold } from "../../components/ui/Fold";
import { SdkCapabilities } from "./BrandViews";
import { EVIDENCE_PANEL_ID } from "./Evidence";
import { SdkHeatmap } from "./Heatmap";
import { SdkLeaderboard } from "./Leaderboard";
import { SdkProfile } from "./Profile";
import { SdkRadar } from "./Radar";
import { type Focus, SLOT_COLORS, readFocus, readPreset, writeState } from "./state";
import { SdkValueScatter } from "./ValueScatter";
import "../tools.css";
import "../../components/supply-chain/supply-chain.css";
import "./sdk.css";

const TITLE = "Best actuator SDKs";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return <section className="sdk-sec" aria-labelledby={`${id}-h`}>
        <h2 id={`${id}-h`}>{title}</h2>
        {children}
    </section>;
}

export function Sdk({ menuOpen = false }: { menuOpen?: boolean }) {
    const [preset, setPreset] = useState<SdkPreset>(() => readPreset());
    const [focus, setFocus] = useState<Focus>(() => readFocus());
    const rows = useMemo(() => sdkLeaderboard(preset), [preset]);
    // Four compare slots; a brand keeps its slot (and colour) until removed.
    const [slots, setSlots] = useState<(string | null)[]>(() =>
        SLOT_COLORS.map((_, i) => (i < 3 ? (rows[i]?.brand.id ?? null) : null)));
    const compare = slots.filter((id): id is string => id !== null);

    useEffect(() => {
        const prev = document.title;
        document.title = TITLE;
        const onHash = () => setFocus(readFocus());
        window.addEventListener("hashchange", onHash);
        return () => {
            document.title = prev;
            window.removeEventListener("hashchange", onHash);
        };
    }, []);
    useEffect(() => writeState(preset, focus), [preset, focus]);
    // Bring the focused brand's row, or the open cell's evidence, into view
    // (deep links, badges and hash changes as well as clicks).
    useEffect(() => {
        if (!focus.brand) return;
        if (focus.dim) document.getElementById(EVIDENCE_PANEL_ID)?.scrollIntoView?.({ block: "nearest" });
        else document.getElementById(`sdk-brand-${focus.brand}`)?.scrollIntoView?.({ block: "nearest" });
    }, [focus.brand, focus.dim]);

    const toggleCompare = (id: string) =>
        setSlots((s) => {
            if (s.includes(id)) return s.map((x) => (x === id ? null : x));
            const free = s.indexOf(null);
            return free < 0 ? s : s.map((x, i) => (i === free ? id : x));
        });
    const colorOf = (id: string) => SLOT_COLORS[Math.max(0, slots.indexOf(id))] ?? SLOT_COLORS[0];
    const toggleOpen = (id: string) =>
        setFocus((f) => (f.brand === id ? { brand: null, dim: null } : { brand: id, dim: null }));
    const openCell = (brand: string, dim: SdkDimension) =>
        setFocus((f) => (f.brand === brand && f.dim === dim ? { brand, dim: null } : { brand, dim }));
    const compared = compare.map((id) => rows.find((r) => r.brand.id === id)).filter((r) => r !== undefined);
    const agreement = SDK_METHOD.gold.agreement;

    return <div className="tool-page sdk-page">
        <PublicHeader path={SDK_PATH} initialOpen={menuOpen} />
        <FootnotesProvider>
            <main className="tool-main">
                <header className="tool-head sdk-head">
                    <p className="tool-kicker">Ecosystem · as of {SDK_AS_OF}</p>
                    <h1>Which actuators have the best SDK?</h1>
                    <p className="tool-lede">{rows.length} brands · 7 dimensions · {SDK_EVIDENCE.length} developer claims</p>
                    <a className="cta-primary" href="/api/v1/sdk">Get the data</a>
                </header>

                <div className="sdk-presets" role="group" aria-label="Reader preset">
                    {SDK_PRESETS.map((p) => <button key={p} type="button" aria-pressed={preset === p} onClick={() => setPreset(p)}>{PRESET_LABEL[p]}</button>)}
                </div>
                <p className="sdk-weights">
                    {SDK_DIMENSIONS.map((d) => <span key={d}>{DIMENSION_SHORT[d]} <b>{Math.round(PRESET_WEIGHTS[preset][d] * 100)}%</b></span>)}
                </p>

                <Section id="sdk-board" title="Leaderboard">
                    <SdkLeaderboard rows={rows} compare={compare} toggleCompare={toggleCompare}
                        open={focus.brand} toggleOpen={toggleOpen}
                        profile={(s) => <SdkProfile brand={s} dim={focus.brand === s.brand.id ? focus.dim : null}
                            onDim={(d) => openCell(s.brand.id, d)} />} />
                </Section>

                <div className="sdk-pair">
                    <Section id="sdk-compare" title="Compare">
                        <SdkRadar brands={compared} colorOf={colorOf} remove={toggleCompare} clear={() => setSlots(SLOT_COLORS.map(() => null))} />
                    </Section>
                    <Section id="sdk-value" title="Score for the money">
                        <SdkValueScatter rows={rows} focus={(id) => setFocus({ brand: id, dim: null })} />
                    </Section>
                </div>

                <div className="sdk-folds">
                    <Fold title="Scores by dimension" headline={`${rows.length} × ${SDK_DIMENSIONS.length}`}>
                        <SdkHeatmap rows={rows} open={focus} onOpen={openCell} />
                    </Fold>
                    <Fold title="What ships" headline="● maker · ○ community">
                        <SdkCapabilities rows={rows} />
                    </Fold>
                    <Fold title="Method" headline="60% checks · ≤40% posts">
                        <p>Each dimension blends objective checks (60%, cited) with developer posts (up to 40%, growing with the number of posts, halving in weight every 24 months; a GitHub issue counts 0.35 of a discussion post since trackers collect bug reports), plus a small pull toward 50 so one check cannot pin a score to 0 or 100. A dimension with no data counts as 50 in the overall and on the radar. Each post was read once ({SDK_METHOD.labelledBy}) and its claims labelled by dimension and polarity and summarised in our words; the labels are committed, no model API runs, and no quotes or usernames are kept. {SDK_METHOD.postsMatched} of {SDK_METHOD.postsScanned} scanned posts named a brand. {redditSeedNote()}</p>
                        <p>Label agreement against {SDK_METHOD.gold.items} separately labelled posts ({SDK_METHOD.gold.labelledBy}); n/a where no gold post makes a claim:</p>
                        <ul className="sdk-agree">
                            {agreement.map((a) => <li key={a.dimension}><span>{DIMENSION_SHORT[a.dimension]}</span>{a.goldItems === 0
                                ? <><b>n/a</b><small>0 gold claims</small></>
                                : <><b>{Math.round(a.agreement * 100)}%</b><small>{a.goldItems} gold claim{a.goldItems === 1 ? "" : "s"}, overlap {Math.round(a.overlap * 100)}%</small></>}</li>)}
                        </ul>
                        <p>Not scored: {UNSCORED_BRANDS.map((b) => b.name).join(", ")} (reducers or bare motors with no software of their own).</p>
                    </Fold>
                </div>

                <SourcesSection />
            </main>
        </FootnotesProvider>
        <PublicFooter />
    </div>;
}
