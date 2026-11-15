import { SEGMENTS, SEGMENT_LABEL } from "../../../../../src/supply-chain/companies";
import type { CountryCluster } from "../../../../../src/supply-chain/country-pages";
import { type MapPin, segmentMix } from "../../../../../src/supply-chain/map";
import { getCompany } from "../../../../../src/supply-chain/registry";
import { CompanyLogo } from "../../../components/CompanyLogo";
import { SegmentMix, SegmentTile } from "../../../components/maps/SegmentTile";

// Level 1 of the country map's drill-down: a named cluster. One line of
// context, what it makes (the segment mix), then its companies as logo
// chips grouped by segment. A chip opens that company (level 2).
export function ClusterCard({ cluster, members, pins, onCompany }: {
    cluster: CountryCluster;
    members: readonly string[];
    pins: readonly MapPin[];
    onCompany: (id: string) => void;
}) {
    const companies = members.flatMap((id) => getCompany(id) ?? []);
    return <div className="cp-ccard">
        <p className="cp-ccard-blurb">{firstSentence(cluster.blurb)}</p>
        <div className="cp-ccard-mix" aria-label="Sites by segment"><SegmentMix mix={segmentMix(pins)} size={14} layout="row" /></div>
        {SEGMENTS.map((seg) => {
            const here = companies.filter((c) => c.segment === seg);
            if (!here.length) return null;
            return <section key={seg} className="cp-ccard-group" aria-label={SEGMENT_LABEL[seg]}>
                <h4><SegmentTile segment={seg} size={12} />{SEGMENT_LABEL[seg]}<span>{here.length}</span></h4>
                <ul>
                    {here.map((c) => <li key={c.id}>
                        <button type="button" onClick={() => onCompany(c.id)}>
                            <CompanyLogo name={c.name} size={18} /><span className="cp-ccard-name">{c.name}</span>
                        </button>
                    </li>)}
                </ul>
            </section>;
        })}
    </div>;
}

function firstSentence(text: string): string {
    const m = text.match(/^.*?[.:](\s|$)/);
    return (m ? m[0] : text).trim().replace(/:$/, ".");
}
