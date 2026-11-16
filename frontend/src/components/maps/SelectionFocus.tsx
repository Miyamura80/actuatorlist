import { useEffect } from "react";
import type { LonLat } from "../../../../src/supply-chain/map";
import { boxOf } from "./cluster";
import { type Point, roomRight, useMap } from "./map-context";

// Flies the map to the current drill-down selection: a company's sites in
// this country (fitted together), or one site up close. Keyed on `id`, so it
// zooms when the selection changes, not on every render.
export function SelectionFocus({ id, points, maxK = 10, inset = 0 }: {
    id: string | null;
    points: readonly LonLat[];
    maxK?: number;
    inset?: number;
}) {
    const { project, zoomTo, svgLayer } = useMap();
    useEffect(() => {
        if (!id || !svgLayer) return;
        const at = points.map((p) => project(p.lon, p.lat)).filter((p): p is Point => !!p);
        if (!at.length) return;
        zoomTo(roomRight(boxOf(at), inset), maxK);
        // Zoom when the selection changes, not on every pan.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, svgLayer]);
    return null;
}
