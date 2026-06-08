import { CategoryPieChart } from "@/components/charts/category-pie";
import { ProjectionLineChart } from "@/components/charts/projection-line";
import { BudgetComparisonChart } from "@/components/charts/budget-comparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBudgetDetails } from "@/lib/actions/budget";
import { getInstallmentProjections } from "@/lib/actions/installments";
import {
  getAccountTotals,
  getSpendingByCategory,
  getTransactions,
} from "@/lib/actions/transactions";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const referenceMonth = `${year}-${String(month).padStart(2, "0")}`;

  const [spendingByCategory, accountTotals, projections, budget, transactions] =
    await Promise.all([
      getSpendingByCategory(referenceMonth),
      getAccountTotals(referenceMonth),
      getInstallmentProjections(12),
      getBudgetDetails(year, month),
      getTransactions({ referenceMonth }),
    ]);

  const comparison = budget.variableExpenses.map((item) => {
    const actual = transactions
      .filter((tx) => tx.category_id === item.category_id)
      .reduce((sum, tx) => sum + tx.amount_cents, 0);

    return {
      category: item.category?.name ?? "Categoria",
      planned: item.amount_cents,
      actual,
    };
  });

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do mês {referenceMonth}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total gasto no cartão
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(totalSpent)}
          </CardContent>
        </Card>
        {accountTotals.map((account) => (
          <Card key={account.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {account.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {formatCurrency(account.total)}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryPieChart data={spendingByCategory} />
        <BudgetComparisonChart data={comparison} />
      </div>

      <ProjectionLineChart data={projections} />
    </div>
  );
}
