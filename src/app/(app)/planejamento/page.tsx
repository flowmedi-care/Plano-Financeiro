import { BudgetForm } from "@/components/planejamento/budget-form";
import { getAccounts } from "@/lib/actions/accounts";
import { getBudgetDetails } from "@/lib/actions/budget";
import { getCategories } from "@/lib/actions/categories";

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;

  const [budget, categories, accounts] = await Promise.all([
    getBudgetDetails(year, month),
    getCategories(),
    getAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planejamento</h1>
        <p className="text-muted-foreground">
          Defina receitas, despesas fixas, metas variáveis e limites de cartão.
        </p>
      </div>
      <BudgetForm
        budgetMonthId={budget.budgetMonth.id}
        year={year}
        month={month}
        incomes={budget.incomes}
        fixedExpenses={budget.fixedExpenses}
        variableExpenses={budget.variableExpenses}
        cardTargets={budget.cardTargets}
        categories={categories}
        accounts={accounts}
      />
    </div>
  );
}
