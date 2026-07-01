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
  previousMonthClosingCents: number | null;
  historyMonth: string;
}

function projectionParams(data: CashFlowProjectionData) {
  return {
    months: data.monthInputs,
    openingBalanceCents: data.settings.opening_balance_cents,
    previousMonthClosingCents: data.previousMonthClosingCents,
    historicalByCategory: data.historicalByCategory,
    defaultEstimationMethod: data.settings.default_estimation_method,
  };
}

export function computeScenarioProjections(
  data: CashFlowProjectionData,
  scenario: ProjectionScenarioWithValues
): MonthProjection[] {
  return projectCashFlow({
    ...projectionParams(data),
    resolveScenarioVariable: (referenceMonth) =>
      resolveScenarioVariable(scenario, referenceMonth),
  });
}

export function computeBaseProjections(
  data: CashFlowProjectionData
): MonthProjection[] {
  return projectCashFlow(projectionParams(data));
}

/** Receitas + fixos + cartão + saldo inicial — sem variáveis nem cenários. */
export function computeSharedBaseProjections(
  data: CashFlowProjectionData
): MonthProjection[] {
  return projectCashFlow({
    ...projectionParams(data),
    months: data.monthInputs.map((month) => ({
      ...month,
      variableSlots: [],
    })),
  });
}
