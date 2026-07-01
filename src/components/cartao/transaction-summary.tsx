"use client";

import { useMemo } from "react";
import type { Person, Transaction } from "@/types/database";
import { computeTransactionSummary, resolveMonthComparison } from "@/lib/transactions/summary";
import { MonthCategoryComparisonChart } from "@/components/charts/month-category-comparison";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatMonthLabel(monthFilter: string): string {
  if (monthFilter === "all") return "Todas as faturas";
  const [year, month] = monthFilter.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function TransactionSummary({
  transactions,
  allTransactions,
  people,
  monthFilter,
}: {
  transactions: Transaction[];
  allTransactions: Transaction[];
  people: Person[];
  monthFilter: string;
}) {
  const summary = computeTransactionSummary(transactions, people);
  const monthComparison = useMemo(
    () => resolveMonthComparison(allTransactions, monthFilter, { type: "all" }),
    [allTransactions, monthFilter]
  );

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma transação neste filtro.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Relatório — {formatMonthLabel(monthFilter)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Por conta</h3>
            <div className="flex justify-between">
              <span>Itaú</span>
              <span className="font-medium">{formatCurrency(summary.itauTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Nubank</span>
              <span className="font-medium">{formatCurrency(summary.nubankTotal)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total geral</span>
              <span>{formatCurrency(summary.grandTotal)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Reembolso</h3>
            {summary.byPerson.length > 0 ? (
              summary.byPerson.map((person) => (
                <div key={person.personId} className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    style={{ borderColor: person.color }}
                  >
                    {person.name}
                  </Badge>
                  <span className="font-medium">{formatCurrency(person.total)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum reembolso atribuído</p>
            )}
            {summary.totalOwed > 0 ? (
              <div className="flex justify-between border-t pt-2 text-sm">
                <span>Total a receber</span>
                <span className="font-medium">{formatCurrency(summary.totalOwed)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Só eu gastei</span>
              <span>{formatCurrency(summary.selfTotal)}</span>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      {monthComparison ? (
        <MonthCategoryComparisonChart
          currentMonth={monthComparison.currentMonth}
          previousMonth={monthComparison.previousMonth}
          items={monthComparison.items}
        />
      ) : null}
    </>
  );
}
