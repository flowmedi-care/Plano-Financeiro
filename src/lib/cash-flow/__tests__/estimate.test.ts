import { describe, expect, it } from "vitest";
import {
  estimateSurplusAllocation,
  computeHistoricalAverage,
  resolveVariableAmount,
} from "@/lib/cash-flow/estimate";

describe("estimateSurplusAllocation", () => {
  it("suggests 500/month for 1 category when positive at month 2", () => {
    const months = [
      { referenceMonth: "2026-05", incomeCents: 100000, fixedCents: 50000, cardCents: 0, freeCents: 50000 },
      { referenceMonth: "2026-06", incomeCents: 100000, fixedCents: 50000, cardCents: 0, freeCents: 50000 },
    ];
    expect(estimateSurplusAllocation(months, 1)).toBe(50000);
  });

  it("returns null when never positive", () => {
    const months = [
      { referenceMonth: "2026-05", incomeCents: 10000, fixedCents: 50000, cardCents: 0, freeCents: -40000 },
      { referenceMonth: "2026-06", incomeCents: 10000, fixedCents: 50000, cardCents: 0, freeCents: -40000 },
    ];
    expect(estimateSurplusAllocation(months, 1)).toBeNull();
  });
});

describe("computeHistoricalAverage", () => {
  it("averages last months", () => {
    const map = new Map([
      ["2026-03", 30000],
      ["2026-04", 50000],
    ]);
    expect(computeHistoricalAverage(map, "2026-05", 3)).toBe(40000);
  });
});

describe("resolveVariableAmount", () => {
  it("uses confirmed amount when set", () => {
    const result = resolveVariableAmount(
      {
        categoryId: "c1",
        amountCents: 25000,
        isTracked: true,
        estimationMethod: "none",
      },
      "2026-05",
      new Map(),
      null
    );
    expect(result).toEqual({ amountCents: 25000, isEstimated: false });
  });
});
