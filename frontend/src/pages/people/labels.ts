// Name labels for the /people network. Labels for the busiest nodes are
// placed first and kept only where they collide with no other label or
// node; every other node still gets its least-crowded spot, used while it is
// hovered, focused or next to the selection.

export const LABEL_FONT = 13;
// Average glyph width of the UI sans at LABEL_FONT, in SVG units.
const CHAR_W = LABEL_FONT * 0.56;
const GAP = 4;

export type Anchor = "start" | "middle" | "end";
export interface LabelSpot {
    x: number;
    y: number;
    anchor: Anchor;
}
export interface LabelNode {
    id: string;
    x: number;
    y: number;
    r: number;
    text: string;
}
interface Box {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

// "Sangbae Kim" stays whole; longer names keep the first initial and the
// surname ("J. Ormerod"), and bracketed asides are dropped.
export function shortName(name: string): string {
    const clean = name.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
    if (clean.length <= 15) return clean;
    const parts = clean.split(" ");
    const last = parts.at(-1) ?? clean;
    return parts.length > 1 ? `${parts[0]?.[0] ?? ""}. ${last}` : clean;
}

// Below, above, right, left: the text box for each side of the node.
function candidates(n: LabelNode): { spot: LabelSpot; box: Box }[] {
    const w = n.text.length * CHAR_W;
    const h = LABEL_FONT;
    const below = n.y + n.r + GAP;
    const above = n.y - n.r - GAP - h;
    const mid = n.y - h / 2;
    // Text baselines sit ~0.8em under the box top.
    const base = (top: number) => top + h * 0.8;
    return [
        { spot: { x: n.x, y: base(below), anchor: "middle" }, box: { x0: n.x - w / 2, y0: below, x1: n.x + w / 2, y1: below + h } },
        { spot: { x: n.x, y: base(above), anchor: "middle" }, box: { x0: n.x - w / 2, y0: above, x1: n.x + w / 2, y1: above + h } },
        { spot: { x: n.x + n.r + GAP, y: base(mid), anchor: "start" }, box: { x0: n.x + n.r + GAP, y0: mid, x1: n.x + n.r + GAP + w, y1: mid + h } },
        { spot: { x: n.x - n.r - GAP, y: base(mid), anchor: "end" }, box: { x0: n.x - n.r - GAP - w, y0: mid, x1: n.x - n.r - GAP, y1: mid + h } },
    ];
}

const hitsBox = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
function hitsCircle(b: Box, n: LabelNode): boolean {
    const cx = Math.min(Math.max(n.x, b.x0), b.x1);
    const cy = Math.min(Math.max(n.y, b.y0), b.y1);
    return Math.hypot(n.x - cx, n.y - cy) < n.r + 1;
}

// `priority` lists the ids whose labels should always show, most important
// first. Returns every node's spot and the subset that is shown always.
export function placeLabels(nodes: LabelNode[], priority: string[], width: number, height: number): { spots: Map<string, LabelSpot>; always: Set<string> } {
    const placed: Box[] = [];
    const spots = new Map<string, LabelSpot>();
    const always = new Set<string>();
    const cost = (n: LabelNode, b: Box) => {
        let c = 0;
        if (b.x0 < 0 || b.y0 < 0 || b.x1 > width || b.y1 > height) c += 100;
        for (const p of placed) if (hitsBox(b, p)) c += 10;
        for (const o of nodes) if (o.id !== n.id && hitsCircle(b, o)) c += 1;
        return c;
    };
    // The first side wins ties, so labels sit below their node when they can.
    const best = (n: LabelNode) =>
        candidates(n)
            .map((cand) => ({ ...cand, c: cost(n, cand.box) }))
            .reduce((a, b) => (b.c < a.c ? b : a));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const id of priority) {
        const n = byId.get(id);
        if (!n) continue;
        const pick = best(n);
        spots.set(id, pick.spot);
        if (pick.c === 0) {
            placed.push(pick.box);
            always.add(id);
        }
    }
    for (const n of nodes) if (!spots.has(n.id)) spots.set(n.id, best(n).spot);
    return { spots, always };
}
