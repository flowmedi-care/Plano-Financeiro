import { describe, expect, it } from "vitest";
import { projectCashFlow } from "@/lib/cash-flow/project";

describe("projectCashFlow", () => {
  it("uses previous month closing as first month opening", () => {
    const projections = projectCashFlow({
      openingBalanceCents: 908200,
      previousMonthClosingCents: 1100000,
      defaultEstimationMethod: "none",
      historicalByCategory: new Map(),
      months: [
        {
          referenceMonth: "2026-07",
          incomeCents: 2192900,
          fixedCents: 1187200,
          cardCents: 518671,
          variableSlots: [],
        },
      ],
    });

    expect(projections[0].openingBalanceCents).toBe(1100000);
    expect(projections[0].closingBalanceCents).toBe(1100000 + projections[0].monthBalanceCents);
  });

  it("chains closing to next month opening", () => {
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

    expect(projections[0].openingBalanceCents).toBe(0);
    expect(projections[0].closingBalanceCents).toBe(30000);
    expect(projections[1].openingBalanceCents).toBe(30000);
    expect(projections[1].closingBalanceCents).toBe(65000);
  });

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

  it("applies negative opening balance to cumulative", () => {
    const projections = projectCashFlow({
      openingBalanceCents: -450000,
      defaultEstimationMethod: "none",
      historicalByCategory: new Map(),
      months: [
        {
          referenceMonth: "2026-06",
          incomeCents: 2192900,
          fixedCents: 1487200,
          cardCents: 688400,
          variableSlots: [],
        },
      ],
    });

    expect(projections[0].monthBalanceCents).toBe(17300);
    expect(projections[0].cumulativeBalanceCents).toBe(-432700);
  });

  it("uses scenario variable resolver when categories are empty", () => {
    const projections = projectCashFlow({
      openingBalanceCents: 0,
      resolveScenarioVariable: () => 500000,
      defaultEstimationMethod: "none",
      historicalByCategory: new Map(),
      months: [
        {
          referenceMonth: "2026-06",
          incomeCents: 1000000,
          fixedCents: 400000,
          cardCents: 100000,
          variableSlots: [],
        },
      ],
    });

    expect(projections[0].variableCents).toBe(500000);
    expect(projections[0].monthBalanceCents).toBe(0);
  });

  it("uses per-month scenario values", () => {
    const projections = projectCashFlow({
      openingBalanceCents: 0,
      resolveScenarioVariable: (ref) =>
        ref === "2026-06" ? 300000 : ref === "2026-07" ? 500000 : 0,
      defaultEstimationMethod: "none",
      historicalByCategory: new Map(),
      months: [
        {
          referenceMonth: "2026-06",
          incomeCents: 1000000,
          fixedCents: 400000,
          cardCents: 100000,
          variableSlots: [],
        },
        {
          referenceMonth: "2026-07",
          incomeCents: 1000000,
          fixedCents: 400000,
          cardCents: 100000,
          variableSlots: [],
        },
      ],
    });

    expect(projections[0].variableCents).toBe(300000);
    expect(projections[1].variableCents).toBe(500000);
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
