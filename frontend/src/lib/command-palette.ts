// The header's search icon and the command palette live in different trees,
// so they meet through one window event. A mounted palette cancels the event;
// with no palette (or before hydration) the icon stays a plain link.
export const OPEN_PALETTE_EVENT = "cmdk:open";

export function openCommandPalette(): boolean {
    return !window.dispatchEvent(new Event(OPEN_PALETTE_EVENT, { cancelable: true }));
}
