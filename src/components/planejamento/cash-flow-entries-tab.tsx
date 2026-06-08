"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CardInstallmentGrid } from "@/components/planejamento/card-installment-grid";
import {
  addCashFlowEntry,
  deleteCashFlowEntry,
  setVariableExpense,
  setVariableTracked,
} from "@/lib/actions/cash-flow";
import { calculateBudgetSummary } from "@/lib/budget/calculations";
import type {
  Card as CreditCard,
  CashFlowEntry,
  Category,
  BudgetVariableExpense,
} from "@/types/database";
import { formatCurrency, parseMoneyInputToCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
export function CashFlowEntriesTab({
  budgetMonthId,
  entries,
  variableExpenses,
  categories,
  cardCents,
  cardGrid,
}: {
  budgetMonthId: string;
  entries: CashFlowEntry[];
  variableExpenses: BudgetVariableExpense[];
  categories: Category[];
  cardCents: number;
  cardGrid: {
    months: string[];
    cards: CreditCard[];
    values: Record<string, number>;
    totalsByMonth: Record<string, number>;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [incomeLabel, setIncomeLabel] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeRecurring, setIncomeRecurring] = useState(true);
  const [fixedLabel, setFixedLabel] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedRecurring, setFixedRecurring] = useState(true);
  const incomes = entries.filter((e) => e.type === "income");
  const fixed = entries.filter((e) => e.type === "fixed_expense");

  const summary = calculateBudgetSummary({
    incomes,
    fixedExpenses: fixed,
    variableExpenses: variableExpenses.filter((v) => v.is_tracked),
    cardCents,
  });

  return (
    <div className="space-y-6">
      <CardInstallmentGrid
        months={cardGrid.months}
        cards={cardGrid.cards}
        values={cardGrid.values}
        totalsByMonth={cardGrid.totalsByMonth}
      />

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Receitas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-600">
            {formatCurrency(summary.totalIncomeCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Fixas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(summary.totalFixedCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cartão</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(summary.totalCardCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Variáveis</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(summary.totalVariableCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo mês</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-2xl font-bold ${
              summary.projectedBalanceCents >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatCurrency(summary.projectedBalanceCents)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {incomes.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span>
                  {item.label}
                  {item.source === "template" ? (
                    <span className="ml-2 text-xs text-muted-foreground">(recorrente)</span>
                  ) : null}
                </span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(item.amount_cents ?? 0)}</span>
                  {item.source !== "template" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        startTransition(() => deleteCashFlowEntry(item.id))
                      }
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            <div className="grid gap-2">
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Ex: Salário"
                  value={incomeLabel}
                  onChange={(e) => setIncomeLabel(e.target.value)}
                />
                <Input
                  placeholder="Valor"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                />
                <Button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await addCashFlowEntry(budgetMonthId, {
                        type: "income",
                        label: incomeLabel,
                        amountCents: parseMoneyInputToCents(incomeAmount),
                        makeRecurring: incomeRecurring,
                        recurringType: "income",
                      });
                      setIncomeLabel("");
                      setIncomeAmount("");
                      toast.success("Receita adicionada");
                    })
                  }
                >
                  Adicionar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="income-recurring"
                  checked={incomeRecurring}
                  onCheckedChange={(c) => setIncomeRecurring(Boolean(c))}
                />
                <Label htmlFor="income-recurring">Tornar recorrente (mensal)</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas fixas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fixed.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span>
                  {item.label}
                  {item.source === "template" ? (
                    <span className="ml-2 text-xs text-muted-foreground">(recorrente)</span>
                  ) : null}
                </span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(item.amount_cents ?? 0)}</span>
                  {item.source !== "template" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        startTransition(() => deleteCashFlowEntry(item.id))
                      }
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            <div className="grid gap-2">
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Ex: Aluguel"
                  value={fixedLabel}
                  onChange={(e) => setFixedLabel(e.target.value)}
                />
                <Input
                  placeholder="Valor"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                />
                <Button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await addCashFlowEntry(budgetMonthId, {
                        type: "fixed_expense",
                        label: fixedLabel,
                        amountCents: parseMoneyInputToCents(fixedAmount),
                        makeRecurring: fixedRecurring,
                        recurringType: "fixed_expense",
                      });
                      setFixedLabel("");
                      setFixedAmount("");
                      toast.success("Despesa fixa adicionada");
                    })
                  }
                >
                  Adicionar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="fixed-recurring"
                  checked={fixedRecurring}
                  onCheckedChange={(c) => setFixedRecurring(Boolean(c))}
                />
                <Label htmlFor="fixed-recurring">Tornar recorrente (mensal)</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variáveis por categoria</CardTitle>
            <p className="text-sm text-muted-foreground">
              Marque para rastrear. Valor vazio = &quot;A definir&quot; na projeção.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((category) => {
              const existing = variableExpenses.find(
                (v) => v.category_id === category.id
              );
              const tracked = existing?.is_tracked ?? false;
              return (
                <div key={category.id} className="flex flex-wrap items-center gap-2">
                  <Checkbox
                    checked={tracked}
                    onCheckedChange={(checked) =>
                      startTransition(() =>
                        setVariableTracked(budgetMonthId, category.id, Boolean(checked))
                      )
                    }
                  />
                  <Label className="w-28">{category.name}</Label>
                  <Input
                    className="w-28"
                    disabled={!tracked}
                    defaultValue={
                      existing?.amount_cents != null
                        ? (existing.amount_cents / 100).toFixed(2)
                        : ""
                    }
                    placeholder="A definir"
                    onBlur={(e) => {
                      if (!tracked) return;
                      const raw = e.target.value.trim();
                      const cents = raw ? parseMoneyInputToCents(raw) : null;
                      startTransition(() =>
                        setVariableExpense(budgetMonthId, category.id, cents, "manual")
                      );
                    }}
                  />
                  {tracked && !existing?.amount_cents ? (
                    <span className="text-xs text-amber-600">A definir</span>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
