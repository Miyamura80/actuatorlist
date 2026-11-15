import "./happydom";
import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { STARTUPS } from "../../src/startups";
import { Startups } from "../src/pages/Startups";

afterEach(cleanup);

test("output shows as a badge where reported, and a mostly undisclosed output map is dropped", () => {
    const c = render(<Startups />).container;
    const reported = STARTUPS.filter((s) => s.unitsPerMonth !== null).length;
    expect(c.querySelectorAll(".su-row")).toHaveLength(STARTUPS.length);
    expect(c.querySelectorAll(".su-badge")).toHaveLength(reported);
    expect([...c.querySelectorAll(".su-head span")].map((s) => s.textContent)).not.toContain("Output");
    expect(c.querySelectorAll(".su-map")).toHaveLength(reported * 2 >= STARTUPS.length ? 2 : 1);
    expect(c.querySelector(".su-map figcaption")?.textContent).toMatch(/raised/i);
});
