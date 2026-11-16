import { HEADER_ICON_PATHS } from "../../../../src/public-navigation";

export function HeaderIcon({ item }: { item: string }) {
    const path = HEADER_ICON_PATHS[item];
    return path && <svg className="site-nav-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d={path} />
    </svg>;
}
