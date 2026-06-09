import {
  projectCashFlow,
  type MonthInput,
  type MonthProjection,
} from "@/lib/cash-flow/project";
import { resolveScenarioVariable } from "@/lib/cash-flow/scenario-variable";
import type { CashFlowSettings } from "@/types/database";
import type { ProjectionScenarioWithValues } from "@/lib/cash-flow/scenario-variable";

export interface CashFlowProjectionData {
  settings: CashFlowSettings;
  monthInputs: MonthInput[];
  historicalByCategory: Map<string, Map<string, number>>;
}

export function computeScenarioProjections(
  data: CashFlowProjectionData,
  scenario: ProjectionScenarioWithValues
): MonthProjection[] {
  return projectCashFlow({
    months: data.monthInputs,
    openingBalanceCents: data.settings.opening_balance_cents,
    resolveScenarioVariable: (referenceMonth) =>
      resolveScenarioVariable(scenario, referenceMonth),
    historicalByCategory: data.historicalByCategory,
    defaultEstimationMethod: data.settings.default_estimation_method,
  });
}

export function computeBaseProjections(
  data: CashFlowProjectionData
): MonthProjection[] {
  return projectCashFlow({
    months: data.monthInputs,
    openingBalanceCents: data.settings.opening_balance_cents,
    historicalByCategory: data.historicalByCategory,
    defaultEstimationMethod: data.settings.default_estimation_method,
  });
}
