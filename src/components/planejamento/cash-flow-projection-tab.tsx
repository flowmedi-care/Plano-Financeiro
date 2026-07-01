"use client";

import { CardInstallmentGrid } from "@/components/planejamento/card-installment-grid";
import { ScenarioTabs, type ScenarioProjectionResult } from "@/components/planejamento/scenario-tabs";
import { ScenariosPdfExport } from "@/components/planejamento/scenarios-pdf-export";
import type { MonthInput } from "@/lib/cash-flow/project";
import type { Card as CreditCard, CashFlowSettings } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CashFlowProjectionTab({
  settings,
  monthInputs,
  scenarios,
  cardGrid,
}: {
  settings: CashFlowSettings;
  monthInputs: MonthInput[];
  scenarios: ScenarioProjectionResult[];
  cardGrid: {
    months: string[];
    futureMonths: string[];
    cards: CreditCard[];
    values: Record<string, number>;
    totalsByMonth: Record<string, number>;
    focusMonth: string;
    historyMonth: string;
  };
}) {
  const firstMonth = monthInputs[0];
  const firstProjection = scenarios[0]?.projections[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Base compartilhada</h2>
          <p className="text-sm text-muted-foreground">
            Receitas, fixos e cartão são iguais em todos os cenários.
          </p>
        </div>
        <ScenariosPdfExport
          settings={settings}
          monthInputs={monthInputs}
          scenarios={scenarios}
          cardGrid={cardGrid}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {firstProjection ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Saldo inicial (1º mês)
                </CardTitle>
              </CardHeader>
              <CardContent
                className={`text-xl font-bold ${
                  firstProjection.openingBalanceCents >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(firstProjection.openingBalanceCents)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Saldo final (1º mês)
                </CardTitle>
              </CardHeader>
              <CardContent
                className={`text-xl font-bold ${
                  firstProjection.closingBalanceCents >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(firstProjection.closingBalanceCents)}
              </CardContent>
            </Card>
          </>
        ) : null}
        {firstMonth ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Receitas (1º mês)</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold text-emerald-600">
                {formatCurrency(firstMonth.incomeCents)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Fixos (1º mês)</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold">
                {formatCurrency(firstMonth.fixedCents)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Cartão (1º mês)</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold">
                {formatCurrency(firstMonth.cardCents)}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <CardInstallmentGrid
        months={cardGrid.months}
        futureMonths={cardGrid.futureMonths}
        cards={cardGrid.cards}
        values={cardGrid.values}
        totalsByMonth={cardGrid.totalsByMonth}
        focusMonth={cardGrid.focusMonth}
        historyMonth={cardGrid.historyMonth}
      />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Cenários de despesas variáveis</h2>
        <ScenarioTabs scenarios={scenarios} months={cardGrid.futureMonths} />
      </div>
    </div>
  );
}
