export interface BudgetSummary {
  totalIncomeCents: number;
  totalFixedCents: number;
  totalVariableCents: number;
  totalCardCents: number;
  projectedBalanceCents: number;
}

export function calculateBudgetSummary(params: {
  incomes: { amount_cents: number | null }[];
  fixedExpenses: { amount_cents: number | null }[];
  variableExpenses: { amount_cents: number | null }[];
  cardCents?: number;
}): BudgetSummary {
  const totalIncomeCents = params.incomes.reduce(
    (sum, item) => sum + (item.amount_cents ?? 0),
    0
  );
  const totalFixedCents = params.fixedExpenses.reduce(
    (sum, item) => sum + (item.amount_cents ?? 0),
    0
  );
  const totalVariableCents = params.variableExpenses.reduce(
    (sum, item) => sum + (item.amount_cents ?? 0),
    0
  );
  const totalCardCents = params.cardCents ?? 0;

  const projectedBalanceCents =
    totalIncomeCents - totalFixedCents - totalVariableCents - totalCardCents;

  return {
    totalIncomeCents,
    totalFixedCents,
    totalVariableCents,
    totalCardCents,
    projectedBalanceCents,
  };
}
