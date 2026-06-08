import { describe, expect, it } from "vitest";
import { buildYAxisScale } from "@/lib/charts/y-axis-scale";

describe("buildYAxisScale", () => {
  it("produces distinct tick counts for 5k, 10k and 20k steps", () => {
    const values = [-8000, 0, 15000, 58000];

    const scale5 = buildYAxisScale(values, 5000);
    const scale10 = buildYAxisScale(values, 10000);
    const scale20 = buildYAxisScale(values, 20000);

    expect(scale5.tickCount).toBe(15);
    expect(scale10.tickCount).toBe(8);
    expect(scale20.tickCount).toBe(5);

    expect(scale5.domain).toEqual([-10000, 60000]);
    expect(scale10.domain).toEqual([-10000, 60000]);
    expect(scale20.domain).toEqual([-20000, 60000]);
  });
});
