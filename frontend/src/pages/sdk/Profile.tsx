import {
    type BrandSummary,
    CAPABILITIES,
    CAPABILITY_LABEL,
    DIMENSION_LABEL,
    DIMENSION_SHORT,
    SDK_DIMENSIONS,
    type SdkDimension,
} from "../../../../src/sdk";
import { EVIDENCE_PANEL_ID, EvidencePanel } from "./Evidence";
import { SdkPainPoints, SdkTimeline } from "./BrandViews";
import { scoreText } from "./state";

const CAP_MARK = { official: "●", community: "○", none: "–" } as const;
const CAP_WORD = { official: "maker", community: "community only", none: "none found" } as const;

// A leaderboard row's inline profile: seven score bars (each opens its
// evidence), what ships as badges, then the sentiment timeline and the
// recurring complaints. Everything a brand section used to say, one click in.
export function SdkProfile({ brand, dim, onDim }: {
    brand: BrandSummary;
    dim: SdkDimension | null;
    onDim: (dim: SdkDimension) => void;
}) {
    const id = brand.brand.id;
    return <div className="sdk-profile" id={`sdk-profile-${id}`}>
        <div className="sdk-profile-top">
            <ul className="sdk-dims" aria-label={`${brand.brand.name} by dimension`}>
                {SDK_DIMENSIONS.map((d) => {
                    const v = brand.score.dimensions[d];
                    const on = dim === d;
                    return <li key={d}>
                        <button type="button" className={`sdk-dim${on ? " is-open" : ""}`}
                            aria-label={`${DIMENSION_LABEL[d]}: ${scoreText(v?.score)}`}
                            aria-expanded={on} aria-controls={on ? EVIDENCE_PANEL_ID : undefined}
                            title={DIMENSION_LABEL[d]} onClick={() => onDim(d)}>
                            <span>{DIMENSION_SHORT[d]}</span>
                            <span className="sdk-bar" aria-hidden="true"><span style={{ width: `${v?.score ?? 0}%` }} /></span>
                            <b>{scoreText(v?.score)}</b>
                        </button>
                    </li>;
                })}
            </ul>
            <div className="sdk-profile-side">
                <ul className="sdk-capchips" aria-label="What ships">
                    {CAPABILITIES.map((c) => {
                        const st = brand.capabilities[c];
                        return <li key={c} className={`sdk-cap-${st}`} title={`${CAPABILITY_LABEL[c]}: ${CAP_WORD[st]}`}
                            aria-label={`${CAPABILITY_LABEL[c]}: ${CAP_WORD[st]}`}>
                            <span aria-hidden="true">{CAP_MARK[st]}</span> {CAPABILITY_LABEL[c]}
                        </li>;
                    })}
                    {brand.pricePerNm !== null
                        ? <li className="sdk-price" title="Median catalog price per N.m">${brand.pricePerNm.toFixed(1)}/N.m</li>
                        : null}
                </ul>
                <SdkTimeline brand={brand} />
            </div>
        </div>
        {dim ? <EvidencePanel brand={id} dim={dim} onClose={() => onDim(dim)} /> : null}
        <SdkPainPoints brand={brand} />
    </div>;
}
