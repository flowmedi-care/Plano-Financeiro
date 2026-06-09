import { describe, expect, it } from "vitest";
import { resolveScenarioVariable } from "@/lib/cash-flow/scenario-variable";
import type { ProjectionScenarioWithValues } from "@/lib/cash-flow/scenario-variable";

function makeScenario(
  partial: Partial<ProjectionScenarioWithValues>
): ProjectionScenarioWithValues {
  return {
    id: "s1",
    user_id: "u1",
    household_id: null,
    scope: "personal",
    name: "Teste",
    type: "fixed",
    fixed_amount_cents: 0,
    sort_order: 0,
    created_at: "",
    monthValues: [],
    ...partial,
  };
}

describe("resolveScenarioVariable", () => {
  it("returns fixed amount for fixed scenarios", () => {
    const scenario = makeScenario({ type: "fixed", fixed_amount_cents: 450000 });
    expect(resolveScenarioVariable(scenario, "2026-06")).toBe(450000);
    expect(resolveScenarioVariable(scenario, "2026-07")).toBe(450000);
  });

  it("returns monthly lookup for monthly scenarios", () => {
    const scenario = makeScenario({
      type: "monthly",
      fixed_amount_cents: null,
      monthValues: [
        {
          id: "v1",
          scenario_id: "s1",
          reference_month: "2026-06",
          amount_cents: 200000,
          created_at: "",
        },
        {
          id: "v2",
          scenario_id: "s1",
          reference_month: "2026-07",
          amount_cents: 350000,
          created_at: "",
        },
      ],
    });

    expect(resolveScenarioVariable(scenario, "2026-06")).toBe(200000);
    expect(resolveScenarioVariable(scenario, "2026-07")).toBe(350000);
    expect(resolveScenarioVariable(scenario, "2026-08")).toBe(0);
  });
});
