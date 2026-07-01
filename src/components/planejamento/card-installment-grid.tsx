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
import { cn } from "@/lib/utils";

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

function formatEvolutionPercent(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1).replace(".", ",")}%`;
}

function evolutionColor(current: number, previous: number): string {
  if (previous <= 0 || current === previous) return "text-muted-foreground";
  return current > previous ? "text-red-600" : "text-emerald-600";
}

export function CardInstallmentGrid({
  months,
  cards,
  values,
  totalsByMonth,
  focusMonth,
  historyMonth,
  readOnly = false,
  lockHistory = false,
}: {
  months: string[];
  cards: Card[];
  values: Record<string, number>;
  totalsByMonth: Record<string, number>;
  focusMonth: string;
  historyMonth: string;
  readOnly?: boolean;
  lockHistory?: boolean;
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

  const displayTotals = readOnly ? totalsByMonth : liveTotals;

  function isMonthEditable(month: string): boolean {
    if (readOnly) return false;
    if (lockHistory && month === historyMonth) return false;
    return true;
  }

  function handleChange(cardId: string, month: string, raw: string) {
    if (!isMonthEditable(month)) return;
    setLocalValues((prev) => ({
      ...prev,
      [cellKey(cardId, month)]: raw,
    }));
    setIsDirty(true);
  }

  function handleSave() {
    const editableMonths = months.filter(isMonthEditable);
    const cells = cards.flatMap((card) =>
      editableMonths.map((month) => {
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
          <CardTitle>Fatura por cartão</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cadastre cartões em Configurações para registrar as faturas mensais.
          </p>
        </CardContent>
      </UiCard>
    );
  }

  const canEdit = !readOnly;

  return (
    <UiCard>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Fatura por cartão</CardTitle>
          <p className="text-sm text-muted-foreground">
            {canEdit
              ? `Preencha a fatura de ${formatMonthShort(focusMonth)} e acompanhe a evolução mês a mês. Clique em Salvar para gravar.`
              : "Histórico e projeção das faturas por cartão."}
          </p>
        </div>
        {canEdit ? (
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
                <TableHead
                  key={month}
                  className={cn(
                    "min-w-[100px] text-right",
                    month === historyMonth && "text-muted-foreground"
                  )}
                >
                  <div>{formatMonthShort(month)}</div>
                  {month === historyMonth ? (
                    <div className="text-[10px] font-normal normal-case">mês anterior</div>
                  ) : month === focusMonth ? (
                    <div className="text-[10px] font-normal normal-case text-primary">
                      mês atual
                    </div>
                  ) : null}
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
                {months.map((month, monthIndex) => {
                  const cents = values[cellKey(card.id, month)];
                  const editable = isMonthEditable(month);
                  const prevMonth = monthIndex > 0 ? months[monthIndex - 1] : null;
                  const currentCents = readOnly
                    ? cents ?? 0
                    : (() => {
                        const raw = localValues[cellKey(card.id, month)]?.trim() ?? "";
                        return raw ? parseMoneyInputToCents(raw) : 0;
                      })();
                  const prevCents = prevMonth
                    ? readOnly
                      ? values[cellKey(card.id, prevMonth)] ?? 0
                      : (() => {
                          const raw = localValues[cellKey(card.id, prevMonth)]?.trim() ?? "";
                          return raw ? parseMoneyInputToCents(raw) : 0;
                        })()
                    : 0;
                  const evolution = prevMonth
                    ? formatEvolutionPercent(currentCents, prevCents)
                    : null;

                  return (
                    <TableCell key={month} className="p-1 text-right">
                      {editable ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <Input
                            className="h-8 w-[96px] text-right text-sm"
                            placeholder="—"
                            disabled={pending}
                            value={localValues[cellKey(card.id, month)] ?? ""}
                            onChange={(e) => handleChange(card.id, month, e.target.value)}
                          />
                          {evolution ? (
                            <span
                              className={cn(
                                "text-[10px] font-medium",
                                evolutionColor(currentCents, prevCents)
                              )}
                            >
                              {evolution}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm">
                            {cents ? formatCurrency(cents) : "—"}
                          </span>
                          {evolution ? (
                            <span
                              className={cn(
                                "text-[10px] font-medium",
                                evolutionColor(currentCents, prevCents)
                              )}
                            >
                              {evolution}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            <TableRow className="font-semibold text-red-600">
              <TableCell className="sticky left-0 z-10 bg-background">Total</TableCell>
              {months.map((month, monthIndex) => {
                const prevMonth = monthIndex > 0 ? months[monthIndex - 1] : null;
                const current = displayTotals[month] ?? 0;
                const previous = prevMonth ? (displayTotals[prevMonth] ?? 0) : 0;
                const evolution = prevMonth
                  ? formatEvolutionPercent(current, previous)
                  : null;

                return (
                  <TableCell key={month} className="text-right">
                    <div>{current > 0 ? formatCurrency(current) : "—"}</div>
                    {evolution ? (
                      <div
                        className={cn(
                          "text-[10px] font-medium",
                          evolutionColor(current, previous)
                        )}
                      >
                        {evolution}
                      </div>
                    ) : null}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </UiCard>
  );
}
