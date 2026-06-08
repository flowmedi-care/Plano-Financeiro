import { PlanejamentoPanel } from "@/components/planejamento/planejamento-panel";
import { getAccounts } from "@/lib/actions/accounts";
import { getBudgetDetails } from "@/lib/actions/budget";
import { getCategories } from "@/lib/actions/categories";
import {
  getCashFlowEntries,
  getCashFlowProjection,
  getOrCreateCashFlowSettings,
} from "@/lib/actions/cash-flow";
import { toReferenceMonth } from "@/lib/utils";

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;

  const [budget, categories, accounts, settings, projection] = await Promise.all([
    getBudgetDetails(year, month),
    getCategories(),
    getAccounts(),
    getOrCreateCashFlowSettings(),
    getCashFlowProjection(year, month),
  ]);

  const entries = await getCashFlowEntries(budget.budgetMonth.id, year, month);
  const ref = toReferenceMonth(year, month);
  const monthProj = projection.projections.find((p) => p.referenceMonth === ref);
  const cardCents = monthProj?.cardCents ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planejamento</h1>
        <p className="text-muted-foreground">
          Fluxo de caixa com receitas recorrentes, parcelas de cartão e estimativa de gastos
          variáveis.
        </p>
      </div>
      <PlanejamentoPanel
        year={year}
        month={month}
        budgetMonthId={budget.budgetMonth.id}
        entries={entries}
        variableExpenses={budget.variableExpenses}
        categories={categories}
        accounts={accounts}
        settings={settings}
        cardCents={cardCents}
        projections={projection.projections}
      />
    </div>
  );
}
