import type { ProjectionScenario, ProjectionScenarioMonthValue } from "@/types/database";

export type ProjectionScenarioWithValues = ProjectionScenario & {
  monthValues: ProjectionScenarioMonthValue[];
};

export function buildScenarioVariableMap(
  scenario: ProjectionScenarioWithValues
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of scenario.monthValues) {
    if (row.amount_cents > 0) {
      map.set(row.reference_month, row.amount_cents);
    }
  }
  return map;
}

export function resolveScenarioVariable(
  scenario: ProjectionScenarioWithValues,
  referenceMonth: string
): number {
  if (scenario.type === "fixed") {
    return scenario.fixed_amount_cents ?? 0;
  }

  const row = scenario.monthValues.find((v) => v.reference_month === referenceMonth);
  return row?.amount_cents ?? 0;
}
