import { GITHUB_MARK_PATH, GITHUB_STAR_PATH } from "../../../src/repo-link";

// Inline GitHub mark placed before the text of a link into the repository.
export function GitHubMark() {
    return <svg className="gh-mark" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
        <path d={GITHUB_MARK_PATH} />
    </svg>;
}

export function GitHubStar() {
    return <svg className="gh-star" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
        <path d={GITHUB_STAR_PATH} />
    </svg>;
}
