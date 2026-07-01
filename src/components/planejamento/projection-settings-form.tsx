"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { setMonthClosingBalance, updateCashFlowSettings } from "@/lib/actions/cash-flow";
import type { CashFlowSettings } from "@/types/database";
import {
  centsToMoneyInput,
  formatCurrency,
  formatReferenceMonthLabel,
  parseMoneyInputToCents,
  parseReferenceMonth,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectionSettingsForm({
  settings,
  historyMonth,
  previousMonthClosingCents,
}: {
  settings: CashFlowSettings;
  historyMonth: string;
  previousMonthClosingCents: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [openingBalance, setOpeningBalance] = useState(
    centsToMoneyInput(settings.opening_balance_cents)
  );
  const [previousClosing, setPreviousClosing] = useState(
    previousMonthClosingCents != null ? centsToMoneyInput(previousMonthClosingCents) : ""
  );

  useEffect(() => {
    setOpeningBalance(centsToMoneyInput(settings.opening_balance_cents));
  }, [settings]);

  useEffect(() => {
    setPreviousClosing(
      previousMonthClosingCents != null ? centsToMoneyInput(previousMonthClosingCents) : ""
    );
  }, [previousMonthClosingCents]);

  const { year: historyYear, month: historyMonthNum } = parseReferenceMonth(historyMonth);

  function handleSaveOpening() {
    startTransition(async () => {
      try {
        await updateCashFlowSettings({
          openingBalanceCents: parseMoneyInputToCents(openingBalance),
        });
        toast.success("Saldo inicial atualizado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao salvar");
      }
    });
  }

  function handleSavePreviousClosing() {
    startTransition(async () => {
      try {
        const raw = previousClosing.trim();
        await setMonthClosingBalance({
          year: historyYear,
          month: historyMonthNum,
          closingBalanceCents: raw ? parseMoneyInputToCents(raw) : null,
        });
        toast.success("Saldo final do mês passado salvo");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao salvar");
      }
    });
  }

  const usesPreviousClosing = previousMonthClosingCents != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldos da projeção</CardTitle>
        <p className="text-sm text-muted-foreground">
          O saldo final de um mês vira o saldo inicial do mês seguinte. Informe quanto sobrou no
          mês passado para a projeção começar certa.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-4">
          <Label>Saldo final de {formatReferenceMonthLabel(historyMonth)}</Label>
          <Input
            className="w-full max-w-[220px]"
            value={previousClosing}
            onChange={(e) => setPreviousClosing(e.target.value)}
            placeholder="Ex: 11.000,00"
          />
          <p className="text-xs text-muted-foreground">
            Quanto ficou na conta ao fechar o mês passado. Esse valor vira o saldo inicial deste
            mês na projeção.
          </p>
          <Button onClick={handleSavePreviousClosing} disabled={pending} size="sm">
            {pending ? "Salvando..." : "Salvar saldo final"}
          </Button>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <Label>Saldo inicial (alternativo)</Label>
          <Input
            className="w-full max-w-[220px]"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">
            {usesPreviousClosing
              ? `Ignorado enquanto o saldo final de ${formatReferenceMonthLabel(historyMonth)} estiver preenchido (${formatCurrency(previousMonthClosingCents)}).`
              : "Usado como saldo inicial do 1º mês da projeção. Aceita negativos (ex: -4.500,00)."}
          </p>
          <Button
            onClick={handleSaveOpening}
            disabled={pending || usesPreviousClosing}
            size="sm"
            variant="outline"
          >
            {pending ? "Salvando..." : "Salvar saldo inicial"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
