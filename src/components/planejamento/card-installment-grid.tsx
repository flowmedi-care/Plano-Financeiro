"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveCardProjectionGrid } from "@/lib/actions/cash-flow";
import type { Card } from "@/types/database";
import { centsToMoneyInput, formatCurrency, parseMoneyInputToCents } from "@/lib/utils";
import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatMonthShort(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString("pt-BR", { month: "short" });
  return `${label.replace(".", "")}/${String(year).slice(2)}`;
}

function cardLabel(card: Card): string {
  return card.last_digits ? `${card.name} ${card.last_digits}` : card.name;
}

function cellKey(cardId: string, month: string) {
  return `${cardId}|${month}`;
}

function buildLocalValues(
  months: string[],
  cards: Card[],
  values: Record<string, number>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const card of cards) {
    for (const month of months) {
      const key = cellKey(card.id, month);
      const cents = values[key];
      out[key] = cents ? centsToMoneyInput(cents) : "";
    }
  }
  return out;
}

export function CardInstallmentGrid({
  months,
  cards,
  values,
  totalsByMonth,
  readOnly = false,
}: {
  months: string[];
  cards: Card[];
  values: Record<string, number>;
  totalsByMonth: Record<string, number>;
  readOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [localValues, setLocalValues] = useState(() =>
    buildLocalValues(months, cards, values)
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalValues(buildLocalValues(months, cards, values));
    setIsDirty(false);
  }, [months, cards, values]);

  const liveTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const month of months) {
      totals[month] = 0;
      for (const card of cards) {
        const raw = localValues[cellKey(card.id, month)]?.trim() ?? "";
        if (raw) totals[month] += parseMoneyInputToCents(raw);
      }
    }
    return totals;
  }, [localValues, months, cards]);

  function handleChange(cardId: string, month: string, raw: string) {
    setLocalValues((prev) => ({
      ...prev,
      [cellKey(cardId, month)]: raw,
    }));
    setIsDirty(true);
  }

  function handleSave() {
    const cells = cards.flatMap((card) =>
      months.map((month) => {
        const raw = localValues[cellKey(card.id, month)]?.trim() ?? "";
        return {
          cardId: card.id,
          referenceMonth: month,
          amountCents: raw ? parseMoneyInputToCents(raw) : null,
        };
      })
    );

    startTransition(async () => {
      try {
        await saveCardProjectionGrid(cells);
        setIsDirty(false);
        toast.success("Fatura por cartão salva");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao salvar");
      }
    });
  }

  function handleDiscard() {
    setLocalValues(buildLocalValues(months, cards, values));
    setIsDirty(false);
  }

  if (cards.length === 0) {
    return (
      <UiCard>
        <CardHeader>
          <CardTitle>Fatura por cartão (projeção)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cadastre cartões em Configurações para preencher a grade de projeção.
          </p>
        </CardContent>
      </UiCard>
    );
  }

  const displayTotals = readOnly ? totalsByMonth : liveTotals;

  return (
    <UiCard>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Fatura por cartão (projeção)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Preencha os valores e clique em Salvar. Uma única gravação atualiza todos os meses.
          </p>
        </div>
        {!readOnly ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!isDirty || pending}
              onClick={handleDiscard}
            >
              Descartar
            </Button>
            <Button size="sm" disabled={!isDirty || pending} onClick={handleSave}>
              {pending ? "Salvando..." : "Salvar fatura"}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-[140px] bg-background">
                Cartão
              </TableHead>
              {months.map((month) => (
                <TableHead key={month} className="min-w-[100px] text-right">
                  {formatMonthShort(month)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="sticky left-0 z-10 bg-background font-medium">
                  {cardLabel(card)}
                </TableCell>
                {months.map((month) => (
                  <TableCell key={month} className="p-1 text-right">
                    {readOnly ? (
                      <span className="text-sm">
                        {values[cellKey(card.id, month)]
                          ? formatCurrency(values[cellKey(card.id, month)])
                          : "—"}
                      </span>
                    ) : (
                      <Input
                        className="h-8 w-[96px] text-right text-sm"
                        placeholder="—"
                        disabled={pending}
                        value={localValues[cellKey(card.id, month)] ?? ""}
                        onChange={(e) => handleChange(card.id, month, e.target.value)}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow className="font-semibold text-red-600">
              <TableCell className="sticky left-0 z-10 bg-background">Total</TableCell>
              {months.map((month) => (
                <TableCell key={month} className="text-right">
                  {displayTotals[month] > 0
                    ? formatCurrency(displayTotals[month])
                    : "—"}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </UiCard>
  );
}
