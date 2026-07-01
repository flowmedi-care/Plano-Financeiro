import type { EstimationMethod } from "@/types/database";
import { toReferenceMonth } from "@/lib/utils";
import {
  estimateSurplusAllocation,
  resolveVariableAmount,
  type MonthFreeCash,
  type VariableSlot,
} from "@/lib/cash-flow/estimate";

export interface MonthInput {
  referenceMonth: string;
  incomeCents: number;
  fixedCents: number;
  cardCents: number;
  variableSlots: VariableSlot[];
}

export interface MonthProjection {
  referenceMonth: string;
  incomeCents: number;
  fixedCents: number;
  cardCents: number;
  variableCents: number;
  variableHasUndefined: boolean;
  variableEstimated: boolean;
  monthBalanceCents: number;
  openingBalanceCents: number;
  closingBalanceCents: number;
  cumulativeBalanceCents: number;
  isPositiveMonth: boolean;
}

export function previousReferenceMonth(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-").map(Number);
  if (month === 1) return toReferenceMonth(year - 1, 12);
  return toReferenceMonth(year, month - 1);
}

export function buildMonthRange(
  startYear: number,
  startMonth: number,
  count: number
): string[] {
  const months: string[] = [];
  let year = startYear;
  let month = startMonth;

  for (let i = 0; i < count; i++) {
    months.push(toReferenceMonth(year, month));
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

export function projectCashFlow(params: {
  months: MonthInput[];
  openingBalanceCents: number;
  previousMonthClosingCents?: number | null;
  resolveScenarioVariable?: (referenceMonth: string) => number;
  historicalByCategory: Map<string, Map<string, number>>;
  defaultEstimationMethod: EstimationMethod;
}): MonthProjection[] {
  const {
    months,
    openingBalanceCents,
    previousMonthClosingCents,
    resolveScenarioVariable,
    historicalByCategory,
    defaultEstimationMethod,
  } = params;

  const freeMonths: MonthFreeCash[] = months.map((m) => ({
    referenceMonth: m.referenceMonth,
    incomeCents: m.incomeCents,
    fixedCents: m.fixedCents,
    cardCents: m.cardCents,
    freeCents: m.incomeCents - m.fixedCents - m.cardCents,
  }));

  const trackedCount = months.reduce((max, m) => {
    const count = m.variableSlots.filter((s) => s.isTracked).length;
    return Math.max(max, count);
  }, 0);

  const surplusPerCategory = estimateSurplusAllocation(freeMonths, trackedCount);

  let opening = params.previousMonthClosingCents ?? openingBalanceCents;
  const results: MonthProjection[] = [];

  for (const month of months) {
    let variableCents = 0;
    let variableHasUndefined = false;
    let variableEstimated = false;

    for (const slot of month.variableSlots) {
      const method =
        slot.estimationMethod === "none"
          ? defaultEstimationMethod
          : slot.estimationMethod;

      const resolved = resolveVariableAmount(
        { ...slot, estimationMethod: method },
        month.referenceMonth,
        historicalByCategory,
        surplusPerCategory
      );

      if (
        slot.isTracked &&
        (slot.amountCents === null || slot.amountCents === 0) &&
        resolved.amountCents === 0
      ) {
        variableHasUndefined = true;
      }

      if (resolved.isEstimated) variableEstimated = true;
      variableCents += resolved.amountCents;
    }

    if (variableCents === 0 && resolveScenarioVariable) {
      const scenarioAmount = resolveScenarioVariable(month.referenceMonth);
      if (scenarioAmount > 0) {
        variableCents = scenarioAmount;
        variableHasUndefined = false;
      }
    }

    const monthBalance =
      month.incomeCents - month.fixedCents - month.cardCents - variableCents;
    const closing = opening + monthBalance;

    results.push({
      referenceMonth: month.referenceMonth,
      incomeCents: month.incomeCents,
      fixedCents: month.fixedCents,
      cardCents: month.cardCents,
      variableCents,
      variableHasUndefined,
      variableEstimated,
      monthBalanceCents: monthBalance,
      openingBalanceCents: opening,
      closingBalanceCents: closing,
      cumulativeBalanceCents: closing,
      isPositiveMonth: closing > 0,
    });

    opening = closing;
  }

  return results;
}
