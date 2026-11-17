import { FOOTER_GROUPS, FOOTER_MORE } from "../../../src/public-navigation";
import { isRepoHref } from "../../../src/repo-link";
import { GitHubMark } from "./GitHubMark";

type Group = (typeof FOOTER_GROUPS)[number];

function Links({ group }: { group: Group }) {
    return <>{group.links.map(([href, label]) => <a key={href} href={href}>{isRepoHref(href) && <GitHubMark />}{label}</a>)}</>;
}

// Three short columns; every other page waits behind a native "All pages" fold.
export function PublicFooter() {
    return <footer className="site-footer"><nav aria-label="Footer">
        {FOOTER_GROUPS.map((group) => <section key={group.label}><h2>{group.label}</h2><Links group={group} /></section>)}
        <details className="site-footer-more">
            <summary>All pages</summary>
            <div className="site-footer-more-body">
                {FOOTER_MORE.map((group) => <section key={group.label}><h2>{group.label}</h2><Links group={group} /></section>)}
            </div>
        </details>
    </nav></footer>;
}
