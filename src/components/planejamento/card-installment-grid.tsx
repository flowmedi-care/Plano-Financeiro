"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setCardProjection } from "@/lib/actions/cash-flow";
import type { Card } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function parseMoneyToCents(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return Math.round(Number.parseFloat(normalized || "0") * 100);
}

function formatMonthShort(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString("pt-BR", { month: "short" });
  return `${label.replace(".", "")}/${String(year).slice(2)}`;
}

function cardLabel(card: Card): string {
  return card.last_digits ? `${card.name} ${card.last_digits}` : card.name;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
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
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  function cellKey(cardId: string, month: string) {
    return `${cardId}|${month}`;
  }

  function displayValue(cardId: string, month: string): string {
    const key = cellKey(cardId, month);
    if (localValues[key] !== undefined) return localValues[key];
    const cents = values[key];
    return cents ? centsToInput(cents) : "";
  }

  function handleBlur(cardId: string, month: string, raw: string) {
    if (readOnly) return;

    startTransition(async () => {
      try {
        const trimmed = raw.trim();
        const cents = trimmed ? parseMoneyToCents(trimmed) : null;
        await setCardProjection({ cardId, referenceMonth: month, amountCents: cents });
        setLocalValues((prev) => {
          const next = { ...prev };
          delete next[cellKey(cardId, month)];
          return next;
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao salvar");
      }
    });
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

  return (
    <UiCard>
      <CardHeader>
        <CardTitle>Fatura por cartão (projeção)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Preencha manualmente o valor previsto de cada cartão por mês. Isso alimenta a coluna
          &quot;Cartão&quot; do fluxo de caixa — separado dos valores reais da importação.
        </p>
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
                        value={displayValue(card.id, month)}
                        onChange={(e) =>
                          setLocalValues((prev) => ({
                            ...prev,
                            [cellKey(card.id, month)]: e.target.value,
                          }))
                        }
                        onBlur={(e) => handleBlur(card.id, month, e.target.value)}
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
                  {totalsByMonth[month] > 0
                    ? formatCurrency(totalsByMonth[month])
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
