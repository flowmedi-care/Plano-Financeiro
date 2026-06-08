"use client";

import { useState } from "react";
import { MonthNavigator } from "@/components/planejamento/month-navigator";
import { CashFlowEntriesTab } from "@/components/planejamento/cash-flow-entries-tab";
import { CashFlowProjectionTab } from "@/components/planejamento/cash-flow-projection-tab";
import type {
  Card,
  CashFlowEntry,
  CashFlowSettings,
  Category,
  BudgetVariableExpense,
} from "@/types/database";
import type { MonthProjection } from "@/lib/cash-flow/project";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlanejamentoPanel({
  year,
  month,
  budgetMonthId,
  entries,
  variableExpenses,
  categories,
  settings,
  cardCents,
  projections,
  cardGrid,
}: {
  year: number;
  month: number;
  budgetMonthId: string;
  entries: CashFlowEntry[];
  variableExpenses: BudgetVariableExpense[];
  categories: Category[];
  settings: CashFlowSettings;
  cardCents: number;
  projections: MonthProjection[];
  cardGrid: {
    months: string[];
    cards: Card[];
    values: Record<string, number>;
    totalsByMonth: Record<string, number>;
  };
}) {
  const [tab, setTab] = useState<"entries" | "flow">("flow");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonthNavigator year={year} month={month} />
        <div className="flex gap-2">
          <Button
            variant={tab === "entries" ? "default" : "outline"}
            onClick={() => setTab("entries")}
          >
            Lançamentos
          </Button>
          <Button
            variant={tab === "flow" ? "default" : "outline"}
            onClick={() => setTab("flow")}
          >
            Fluxo de caixa
          </Button>
        </div>
      </div>

      <div className={cn(tab === "entries" ? "block" : "hidden")}>
        <CashFlowEntriesTab
          budgetMonthId={budgetMonthId}
          entries={entries}
          variableExpenses={variableExpenses}
          categories={categories}
          settings={settings}
          cardCents={cardCents}
          cardGrid={cardGrid}
        />
      </div>

      <div className={cn(tab === "flow" ? "block" : "hidden")}>
        <CashFlowProjectionTab
          projections={projections}
          defaultMethod={settings.default_estimation_method}
          cardGrid={cardGrid}
        />
      </div>
    </div>
  );
}
