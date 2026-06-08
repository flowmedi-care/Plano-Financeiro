"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addBudgetFixedExpense,
  addBudgetIncome,
  copyPreviousBudget,
  deleteBudgetItem,
  setBudgetCardTarget,
  setBudgetVariableExpense,
} from "@/lib/actions/budget";
import type { Account, Category } from "@/types/database";
import { calculateBudgetSummary } from "@/lib/budget/calculations";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
function parseMoneyToCents(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return Math.round(Number.parseFloat(normalized || "0") * 100);
}

export function BudgetForm({
  budgetMonthId,
  year,
  month,
  incomes,
  fixedExpenses,
  variableExpenses,
  cardTargets,
  categories,
  accounts,
}: {
  budgetMonthId: string;
  year: number;
  month: number;
  incomes: { id: string; label: string; amount_cents: number }[];
  fixedExpenses: { id: string; label: string; amount_cents: number }[];
  variableExpenses: { id: string; category_id: string; amount_cents: number; category?: Category }[];
  cardTargets: { id: string; account_id: string; amount_cents: number; account?: Account }[];
  categories: Category[];
  accounts: Account[];
}) {
  const [pending, startTransition] = useTransition();
  const [incomeLabel, setIncomeLabel] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [fixedLabel, setFixedLabel] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");

  const summary = calculateBudgetSummary({
    incomes,
    fixedExpenses,
    variableExpenses,
    cardTargets,
  });

  function handleAddIncome() {
    startTransition(async () => {
      try {
        await addBudgetIncome(budgetMonthId, incomeLabel, parseMoneyToCents(incomeAmount));
        setIncomeLabel("");
        setIncomeAmount("");
        toast.success("Receita adicionada");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro");
      }
    });
  }

  function handleAddFixed() {
    startTransition(async () => {
      try {
        await addBudgetFixedExpense(
          budgetMonthId,
          fixedLabel,
          parseMoneyToCents(fixedAmount)
        );
        setFixedLabel("");
        setFixedAmount("");
        toast.success("Despesa fixa adicionada");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Planejamento {String(month).padStart(2, "0")}/{year}
        </h2>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await copyPreviousBudget(year, month);
              toast.success("Dados copiados do mês anterior");
            })
          }
        >
          Copiar mês anterior
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-600">
            {formatCurrency(summary.totalIncomeCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fixas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(summary.totalFixedCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variáveis
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(summary.totalVariableCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo projetado
            </CardTitle>
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
                <span>{item.label}</span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(item.amount_cents)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      startTransition(() => deleteBudgetItem("budget_incomes", item.id))
                    }
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
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
              <Button onClick={handleAddIncome} disabled={pending}>
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas fixas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fixedExpenses.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span>{item.label}</span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(item.amount_cents)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      startTransition(() =>
                        deleteBudgetItem("budget_fixed_expenses", item.id)
                      )
                    }
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
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
              <Button onClick={handleAddFixed} disabled={pending}>
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas variáveis por categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((category) => {
              const existing = variableExpenses.find(
                (item) => item.category_id === category.id
              );
              return (
                <div key={category.id} className="flex items-center gap-2">
                  <Label className="w-32">{category.name}</Label>
                  <Input
                    defaultValue={
                      existing ? (existing.amount_cents / 100).toFixed(2) : ""
                    }
                    placeholder="0,00"
                    onBlur={(e) => {
                      const cents = parseMoneyToCents(e.target.value);
                      if (cents > 0) {
                        startTransition(() =>
                          setBudgetVariableExpense(budgetMonthId, category.id, cents)
                        );
                      }
                    }}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meta de cartão por conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.map((account) => {
              const existing = cardTargets.find(
                (item) => item.account_id === account.id
              );
              return (
                <div key={account.id} className="flex items-center gap-2">
                  <Label className="w-32">{account.name}</Label>
                  <Input
                    defaultValue={
                      existing ? (existing.amount_cents / 100).toFixed(2) : ""
                    }
                    placeholder="0,00"
                    onBlur={(e) => {
                      const cents = parseMoneyToCents(e.target.value);
                      if (cents >= 0) {
                        startTransition(() =>
                          setBudgetCardTarget(budgetMonthId, account.id, cents)
                        );
                      }
                    }}
                  />
                </div>
              );
            })}
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Cadastre contas em Configurações.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
