export interface BudgetSummary {
  totalIncomeCents: number;
  totalFixedCents: number;
  totalVariableCents: number;
  totalCardTargetCents: number;
  projectedBalanceCents: number;
}

export function calculateBudgetSummary(params: {
  incomes: { amount_cents: number }[];
  fixedExpenses: { amount_cents: number }[];
  variableExpenses: { amount_cents: number }[];
  cardTargets: { amount_cents: number }[];
}): BudgetSummary {
  const totalIncomeCents = params.incomes.reduce((sum, item) => sum + item.amount_cents, 0);
  const totalFixedCents = params.fixedExpenses.reduce(
    (sum, item) => sum + item.amount_cents,
    0
  );
  const totalVariableCents = params.variableExpenses.reduce(
    (sum, item) => sum + item.amount_cents,
    0
  );
  const totalCardTargetCents = params.cardTargets.reduce(
    (sum, item) => sum + item.amount_cents,
    0
  );

  const projectedBalanceCents =
    totalIncomeCents - totalFixedCents - totalVariableCents - totalCardTargetCents;

  return {
    totalIncomeCents,
    totalFixedCents,
    totalVariableCents,
    totalCardTargetCents,
    projectedBalanceCents,
  };
}
