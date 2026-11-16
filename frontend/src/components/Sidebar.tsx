import { CODE_LICENSE } from "../../../src/repo-link";
import { GitHubMark, GitHubStar } from "./GitHubMark";

export interface NavItem {
    id: string;
    label: string;
}

interface Props {
    items: NavItem[];
    active: string;
    onSelect: (id: string) => void;
}

export function Sidebar({ items, active, onSelect }: Props) {
    return (
        <aside className="sidebar">
            <nav>
                {items.map((it) => (
                    <button
                        type="button"
                        key={it.id}
                        className="side-link"
                        data-on={active === it.id}
                        onClick={() => onSelect(it.id)}
                    >
                        {it.label}
                    </button>
                ))}
            </nav>
            <a href={CODE_LICENSE.href} className="open-source-link sidebar-source">
                <GitHubMark />
                <GitHubStar />
                {CODE_LICENSE.label}
            </a>
        </aside>
    );
}
