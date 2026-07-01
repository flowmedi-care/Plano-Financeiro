import { CategoryPieChart } from "@/components/charts/category-pie";
import { ProjectionLineChart } from "@/components/charts/projection-line";
import { BudgetComparisonChart } from "@/components/charts/budget-comparison";
import { MonthCategoryComparisonSection } from "@/components/charts/month-category-comparison";
import { PersonOwedChart } from "@/components/charts/person-owed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBudgetDetails } from "@/lib/actions/budget";
import { getInstallmentProjections } from "@/lib/actions/installments";
import { getPeople } from "@/lib/actions/people";
import { getAmountsOwedByPerson } from "@/lib/actions/splits";
import {
  getAccountTotals,
  getReferenceMonths,
  getSpendingByCategory,
  getTransactions,
} from "@/lib/actions/transactions";
import { formatReferenceMonthLabel } from "@/lib/transactions/summary";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const referenceMonths = await getReferenceMonths();
  const referenceMonth =
    referenceMonths[referenceMonths.length - 1] ??
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

  const [year, month] = referenceMonth.split("-").map(Number);

  const [
    spendingByCategory,
    accountTotals,
    projections,
    budget,
    transactions,
    amountsOwed,
    allTransactions,
    people,
  ] = await Promise.all([
    getSpendingByCategory(referenceMonth),
    getAccountTotals(referenceMonth),
    getInstallmentProjections(12),
    getBudgetDetails(year, month),
    getTransactions({ referenceMonth }),
    getAmountsOwedByPerson(referenceMonth),
    getTransactions(),
    getPeople(),
  ]);

  const monthComparison =
    referenceMonths.length >= 2
      ? {
          currentMonth: referenceMonths[referenceMonths.length - 1],
          previousMonth: referenceMonths[referenceMonths.length - 2],
        }
      : null;

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
  const totalOwed = amountsOwed.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da fatura {formatReferenceMonthLabel(referenceMonth)}
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
        {totalOwed > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                A receber de terceiros
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalOwed)}
            </CardContent>
          </Card>
        ) : null}
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

      <PersonOwedChart data={amountsOwed} />

      {monthComparison ? (
        <MonthCategoryComparisonSection
          allTransactions={allTransactions}
          people={people}
          currentMonth={monthComparison.currentMonth}
          previousMonth={monthComparison.previousMonth}
          defaultScope="self"
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryPieChart data={spendingByCategory} />
        <BudgetComparisonChart data={comparison} />
      </div>

      <ProjectionLineChart data={projections} />
    </div>
  );
}
