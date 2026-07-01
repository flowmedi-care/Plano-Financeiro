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

type GridTab = "monthly" | "projection";

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

function getCentsFromLocal(
  localValues: Record<string, string>,
  cardId: string,
  month: string
): number {
  const raw = localValues[cellKey(cardId, month)]?.trim() ?? "";
  return raw ? parseMoneyInputToCents(raw) : 0;
}

export function CardInstallmentGrid({
  months,
  futureMonths,
  cards,
  values,
  totalsByMonth,
  focusMonth,
  historyMonth,
}: {
  months: string[];
  futureMonths: string[];
  cards: Card[];
  values: Record<string, number>;
  totalsByMonth: Record<string, number>;
  focusMonth: string;
  historyMonth: string;
}) {
  const [activeTab, setActiveTab] = useState<GridTab>("monthly");
  const [pending, startTransition] = useTransition();
  const allMonths = useMemo(
    () => [...new Set([...months, ...futureMonths])],
    [months, futureMonths]
  );
  const [localValues, setLocalValues] = useState(() =>
    buildLocalValues(allMonths, cards, values)
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalValues(buildLocalValues(allMonths, cards, values));
    setIsDirty(false);
  }, [allMonths, cards, values]);

  const liveTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const month of allMonths) {
      totals[month] = 0;
      for (const card of cards) {
        totals[month] += getCentsFromLocal(localValues, card.id, month);
      }
    }
    return totals;
  }, [localValues, allMonths, cards]);

  function handleChange(cardId: string, month: string, raw: string) {
    setLocalValues((prev) => ({
      ...prev,
      [cellKey(cardId, month)]: raw,
    }));
    setIsDirty(true);
  }

  function handleSave() {
    const cells = cards.flatMap((card) =>
      allMonths.map((month) => {
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
    setLocalValues(buildLocalValues(allMonths, cards, values));
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

  const historyTotal = liveTotals[historyMonth] ?? 0;
  const focusTotal = liveTotals[focusMonth] ?? 0;
  const totalEvolution = formatEvolutionPercent(focusTotal, historyTotal);

  return (
    <UiCard>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <CardTitle>Fatura por cartão</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("monthly")}
            >
              Fatura do mês
            </Button>
            <Button
              variant={activeTab === "projection" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("projection")}
            >
              Projeção futura
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {activeTab === "monthly"
              ? `Registre a fatura de ${formatMonthShort(focusMonth)} e compare com ${formatMonthShort(historyMonth)}.`
              : "Planeje as faturas dos próximos meses (o que você preencheu no mês passado)."}
          </p>
        </div>
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
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        {activeTab === "monthly" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Cartão</TableHead>
                <TableHead className="text-right">
                  {formatMonthShort(historyMonth)}
                  <div className="text-[10px] font-normal normal-case text-muted-foreground">
                    mês passado
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  {formatMonthShort(focusMonth)}
                  <div className="text-[10px] font-normal normal-case text-primary">
                    este mês
                  </div>
                </TableHead>
                <TableHead className="min-w-[80px] text-right">Variação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((card) => {
                const historyCents = getCentsFromLocal(localValues, card.id, historyMonth);
                const focusCents = getCentsFromLocal(localValues, card.id, focusMonth);
                const evolution = formatEvolutionPercent(focusCents, historyCents);

                return (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">{cardLabel(card)}</TableCell>
                    <TableCell className="p-1 text-right">
                      <Input
                        className="ml-auto h-8 w-[110px] text-right text-sm"
                        placeholder="—"
                        disabled={pending}
                        value={localValues[cellKey(card.id, historyMonth)] ?? ""}
                        onChange={(e) =>
                          handleChange(card.id, historyMonth, e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="p-1 text-right">
                      <Input
                        className="ml-auto h-8 w-[110px] text-right text-sm"
                        placeholder="—"
                        disabled={pending}
                        value={localValues[cellKey(card.id, focusMonth)] ?? ""}
                        onChange={(e) => handleChange(card.id, focusMonth, e.target.value)}
                      />
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm font-medium",
                        evolution
                          ? evolutionColor(focusCents, historyCents)
                          : "text-muted-foreground"
                      )}
                    >
                      {evolution ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-semibold text-red-600">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {historyTotal > 0 ? formatCurrency(historyTotal) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {focusTotal > 0 ? formatCurrency(focusTotal) : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right text-sm",
                    totalEvolution
                      ? evolutionColor(focusTotal, historyTotal)
                      : "text-muted-foreground"
                  )}
                >
                  {totalEvolution ?? "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-[140px] bg-background">
                  Cartão
                </TableHead>
                {futureMonths.map((month) => (
                  <TableHead key={month} className="min-w-[100px] text-right">
                    {formatMonthShort(month)}
                    {month === focusMonth ? (
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
                  {futureMonths.map((month, monthIndex) => {
                    const prevMonth =
                      monthIndex > 0 ? futureMonths[monthIndex - 1] : null;
                    const currentCents = getCentsFromLocal(localValues, card.id, month);
                    const prevCents = prevMonth
                      ? getCentsFromLocal(localValues, card.id, prevMonth)
                      : 0;
                    const evolution = prevMonth
                      ? formatEvolutionPercent(currentCents, prevCents)
                      : null;

                    return (
                      <TableCell key={month} className="p-1 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <Input
                            className="h-8 w-[96px] text-right text-sm"
                            placeholder="—"
                            disabled={pending}
                            value={localValues[cellKey(card.id, month)] ?? ""}
                            onChange={(e) =>
                              handleChange(card.id, month, e.target.value)
                            }
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
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              <TableRow className="font-semibold text-red-600">
                <TableCell className="sticky left-0 z-10 bg-background">Total</TableCell>
                {futureMonths.map((month, monthIndex) => {
                  const prevMonth = monthIndex > 0 ? futureMonths[monthIndex - 1] : null;
                  const current = liveTotals[month] ?? 0;
                  const previous = prevMonth ? (liveTotals[prevMonth] ?? 0) : 0;
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
        )}
      </CardContent>
    </UiCard>
  );
}
