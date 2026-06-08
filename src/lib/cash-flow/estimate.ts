import type { EstimationMethod } from "@/types/database";
import { toReferenceMonth } from "@/lib/utils";

export interface VariableSlot {
  categoryId: string;
  amountCents: number | null;
  isTracked: boolean;
  estimationMethod: EstimationMethod;
}

export interface MonthFreeCash {
  referenceMonth: string;
  incomeCents: number;
  fixedCents: number;
  cardCents: number;
  freeCents: number;
}

export function computeHistoricalAverage(
  spendingByMonth: Map<string, number>,
  referenceMonth: string,
  lookback = 3
): number | null {
  const [year, month] = referenceMonth.split("-").map(Number);
  const amounts: number[] = [];

  for (let i = 1; i <= lookback; i++) {
    let m = month - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const ref = toReferenceMonth(y, m);
    const value = spendingByMonth.get(ref);
    if (value !== undefined && value > 0) {
      amounts.push(value);
    }
  }

  if (amounts.length === 0) return null;
  return Math.round(amounts.reduce((s, v) => s + v, 0) / amounts.length);
}

export function estimateSurplusAllocation(
  months: MonthFreeCash[],
  trackedCategoryCount: number
): number | null {
  if (trackedCategoryCount <= 0 || months.length === 0) return null;

  let cumulative = 0;
  for (let i = 0; i < months.length; i++) {
    cumulative += months[i].freeCents;
    if (cumulative > 0) {
      const perMonth = Math.floor(cumulative / (i + 1));
      return Math.floor(perMonth / trackedCategoryCount);
    }
  }

  return null;
}

export function resolveVariableAmount(
  slot: VariableSlot,
  referenceMonth: string,
  historicalByCategory: Map<string, Map<string, number>>,
  surplusEstimatePerCategory: number | null
): { amountCents: number; isEstimated: boolean } {
  if (slot.amountCents !== null && slot.amountCents > 0) {
    return { amountCents: slot.amountCents, isEstimated: false };
  }

  if (!slot.isTracked) {
    return { amountCents: 0, isEstimated: false };
  }

  if (slot.estimationMethod === "historical_avg") {
    const history = historicalByCategory.get(slot.categoryId);
    const avg = history
      ? computeHistoricalAverage(history, referenceMonth)
      : null;
    if (avg !== null && avg > 0) {
      return { amountCents: avg, isEstimated: true };
    }
  }

  if (
    (slot.estimationMethod === "surplus_allocation" ||
      slot.estimationMethod === "none") &&
    surplusEstimatePerCategory !== null &&
    surplusEstimatePerCategory > 0
  ) {
    return { amountCents: surplusEstimatePerCategory, isEstimated: true };
  }

  return { amountCents: 0, isEstimated: false };
}
