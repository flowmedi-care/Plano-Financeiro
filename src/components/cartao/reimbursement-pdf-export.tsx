"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Person, Transaction } from "@/types/database";
import {
  computeOwedByCategory,
  computeTransactionSummary,
  getPersonOwedTransactions,
} from "@/lib/transactions/summary";
import { generateReimbursementPdf } from "@/lib/reports/reimbursement-pdf";
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

  const [selectedPersonId, setSelectedPersonId] = useState(
    peopleWithDebt[0]?.id ?? ""
  );

  const selectedPerson = people.find((p) => p.id === selectedPersonId);

  function handleExport() {
    if (!selectedPerson) {
      toast.error("Selecione uma pessoa");
      return;
    }

    const owedTransactions = getPersonOwedTransactions(transactions, selectedPerson.id);

    if (owedTransactions.length === 0) {
      toast.error("Nenhuma transação para esta pessoa no filtro atual");
      return;
    }

    try {
      generateReimbursementPdf({
        person: selectedPerson,
        monthLabel: formatMonthLabel(monthFilter),
        owedTransactions,
        categoryBreakdown: computeOwedByCategory(owedTransactions),
      });
      toast.success("PDF gerado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar PDF");
    }
  }

  if (peopleWithDebt.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar cobrança (PDF)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Gera um relatório com transações, totais por categoria e gráfico para enviar a quem deve reembolsar.
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Pessoa</Label>
          <Select
            value={selectedPersonId || peopleWithDebt[0]?.id}
            onValueChange={setSelectedPersonId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
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
