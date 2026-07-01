import { PlanejamentoPanel } from "@/components/planejamento/planejamento-panel";
import { getBudgetDetails } from "@/lib/actions/budget";
import { getCategories } from "@/lib/actions/categories";
import {
  getCashFlowEntries,
  loadCashFlowProjectionData,
  getOrCreateCashFlowSettings,
} from "@/lib/actions/cash-flow";
import { listProjectionScenarios } from "@/lib/actions/projection-scenarios";
import { computeScenarioProjections } from "@/lib/cash-flow/compute-projection";
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

  const [budget, categories, settings, projectionData, scenarios] = await Promise.all([
    getBudgetDetails(year, month),
    getCategories(),
    getOrCreateCashFlowSettings(),
    loadCashFlowProjectionData(year, month),
    listProjectionScenarios(),
  ]);

  const entries = await getCashFlowEntries(budget.budgetMonth.id, year, month);
  const ref = toReferenceMonth(year, month);
  const monthInput = projectionData.monthInputs.find((p) => p.referenceMonth === ref);
  const cardCents = monthInput?.cardCents ?? 0;

  const scenarioResults = scenarios.map((scenario) => {
    const monthValues: Record<string, number> = {};
    for (const row of scenario.monthValues) {
      monthValues[row.reference_month] = row.amount_cents;
    }
    return {
      scenario,
      projections: computeScenarioProjections(projectionData, scenario),
      monthValues,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planejamento</h1>
        <p className="text-muted-foreground">
          Fluxo de caixa com receitas recorrentes, parcelas de cartão e cenários de despesas
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
        settings={settings}
        cardCents={cardCents}
        monthInputs={projectionData.monthInputs}
        scenarios={scenarioResults}
        cardGrid={projectionData.cardGrid}
        historyMonth={projectionData.historyMonth}
        previousMonthClosingCents={projectionData.previousMonthClosingCents}
      />
    </div>
  );
}
