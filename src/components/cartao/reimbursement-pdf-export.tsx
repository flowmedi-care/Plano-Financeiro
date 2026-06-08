"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Person, Transaction } from "@/types/database";
import {
  computeOwedByCategory,
  computeSelfByCategory,
  computeTransactionSummary,
  getPersonOwedTransactions,
  getSelfTransactions,
} from "@/lib/transactions/summary";
import { generateSpendingReportPdf } from "@/lib/reports/reimbursement-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown } from "lucide-react";

const SELF_OPTION_ID = "__self__";

function formatMonthLabel(monthFilter: string): string {
  if (monthFilter === "all") return "Todas as faturas";
  const [year, month] = monthFilter.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function ReimbursementPdfExport({
  transactions,
  people,
  monthFilter,
}: {
  transactions: Transaction[];
  people: Person[];
  monthFilter: string;
}) {
  const summary = useMemo(
    () => computeTransactionSummary(transactions, people),
    [transactions, people]
  );

  const peopleWithDebt = useMemo(
    () =>
      summary.byPerson
        .map((item) => people.find((p) => p.id === item.personId))
        .filter((p): p is Person => Boolean(p)),
    [summary.byPerson, people]
  );

  const hasSelfSpending = summary.selfTotal > 0;

  const defaultSelection = hasSelfSpending
    ? SELF_OPTION_ID
    : peopleWithDebt[0]?.id ?? "";

  const [selectedId, setSelectedId] = useState(defaultSelection);

  const selectedPerson =
    selectedId !== SELF_OPTION_ID
      ? people.find((p) => p.id === selectedId)
      : null;

  function handleExport() {
    const monthLabel = formatMonthLabel(monthFilter);

    if (selectedId === SELF_OPTION_ID) {
      const selfTransactions = getSelfTransactions(transactions);

      if (selfTransactions.length === 0) {
        toast.error("Nenhum gasto seu neste filtro");
        return;
      }

      try {
        generateSpendingReportPdf({
          recipientName: "Eu",
          reportTitle: "Relatório de Gastos",
          totalLabel: "Total gasto (só eu)",
          amountColumnLabel: "Meu gasto",
          monthLabel,
          lineItems: selfTransactions.map((item) => ({
            transaction: item.transaction,
            amountCents: item.selfCents,
          })),
          categoryBreakdown: computeSelfByCategory(selfTransactions),
          filePrefix: "gastos-eu",
        });
        toast.success("PDF gerado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao gerar PDF");
      }
      return;
    }

    if (!selectedPerson) {
      toast.error("Selecione uma pessoa");
      return;
    }

    const owedTransactions = getPersonOwedTransactions(
      transactions,
      selectedPerson.id
    );

    if (owedTransactions.length === 0) {
      toast.error("Nenhuma transação para esta pessoa no filtro atual");
      return;
    }

    try {
      generateSpendingReportPdf({
        recipientName: selectedPerson.name,
        reportTitle: "Relatório de Reembolso",
        totalLabel: "Total a pagar",
        amountColumnLabel: "A pagar",
        monthLabel,
        lineItems: owedTransactions.map((item) => ({
          transaction: item.transaction,
          amountCents: item.owedCents,
        })),
        categoryBreakdown: computeOwedByCategory(owedTransactions),
        filePrefix: "reembolso",
      });
      toast.success("PDF gerado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar PDF");
    }
  }

  if (!hasSelfSpending && peopleWithDebt.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar relatório (PDF)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Gera um relatório com transações, totais por categoria e gráfico — para cobrança ou para ver seus gastos.
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Pessoa</Label>
          <Select
            value={selectedId || defaultSelection}
            onValueChange={setSelectedId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {hasSelfSpending ? (
                <SelectItem value={SELF_OPTION_ID}>
                  Eu (meus gastos)
                </SelectItem>
              ) : null}
              {peopleWithDebt.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExport} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Baixar PDF
        </Button>
      </CardContent>
    </Card>
  );
}
