import { describe, expect, it } from "vitest";
import { projectCashFlow } from "@/lib/cash-flow/project";

describe("projectCashFlow", () => {
  it("computes cumulative balance with opening balance", () => {
    const projections = projectCashFlow({
      openingBalanceCents: 0,
      defaultEstimationMethod: "none",
      historicalByCategory: new Map(),
      months: [
        {
          referenceMonth: "2026-05",
          incomeCents: 100000,
          fixedCents: 50000,
          cardCents: 20000,
          variableSlots: [],
        },
        {
          referenceMonth: "2026-06",
          incomeCents: 100000,
          fixedCents: 50000,
          cardCents: 15000,
          variableSlots: [],
        },
      ],
    });

    expect(projections[0].monthBalanceCents).toBe(30000);
    expect(projections[0].cumulativeBalanceCents).toBe(30000);
    expect(projections[1].cumulativeBalanceCents).toBe(65000);
  });

  it("estimates variable via surplus for tracked slots", () => {
    const projections = projectCashFlow({
      openingBalanceCents: 0,
      defaultEstimationMethod: "surplus_allocation",
      historicalByCategory: new Map(),
      months: [
        {
          referenceMonth: "2026-05",
          incomeCents: 100000,
          fixedCents: 50000,
          cardCents: 0,
          variableSlots: [
            {
              categoryId: "cat1",
              amountCents: null,
              isTracked: true,
              estimationMethod: "none",
            },
          ],
        },
        {
          referenceMonth: "2026-06",
          incomeCents: 100000,
          fixedCents: 50000,
          cardCents: 0,
          variableSlots: [
            {
              categoryId: "cat1",
              amountCents: null,
              isTracked: true,
              estimationMethod: "none",
            },
          ],
        },
      ],
    });

    expect(projections[1].variableEstimated).toBe(true);
    expect(projections[1].variableCents).toBeGreaterThan(0);
  });
});
