"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateCashFlowSettings } from "@/lib/actions/cash-flow";
import type { CashFlowSettings } from "@/types/database";
import { centsToMoneyInput, formatCurrency, parseMoneyInputToCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectionSettingsForm({ settings }: { settings: CashFlowSettings }) {
  const [pending, startTransition] = useTransition();
  const [openingBalance, setOpeningBalance] = useState(
    centsToMoneyInput(settings.opening_balance_cents)
  );
  const [variableProjection, setVariableProjection] = useState(
    centsToMoneyInput(settings.monthly_variable_projection_cents ?? 0)
  );

  useEffect(() => {
    setOpeningBalance(centsToMoneyInput(settings.opening_balance_cents));
    setVariableProjection(
      centsToMoneyInput(settings.monthly_variable_projection_cents ?? 0)
    );
  }, [settings]);

  function handleSave() {
    startTransition(async () => {
      try {
        await updateCashFlowSettings({
          openingBalanceCents: parseMoneyInputToCents(openingBalance),
          monthlyVariableProjectionCents: parseMoneyInputToCents(variableProjection),
        });
        toast.success("Configurações da projeção salvas");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao salvar");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações da projeção</CardTitle>
        <p className="text-sm text-muted-foreground">
          Saldo inicial: {formatCurrency(settings.opening_balance_cents)} · Variáveis/mês:{" "}
          {formatCurrency(settings.monthly_variable_projection_cents ?? 0)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Conta corrente (início da projeção)</Label>
          <Input
            className="w-[200px]"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">Aceita valores negativos (ex: -4500,00)</p>
        </div>
        <div className="space-y-2">
          <Label>Despesas variáveis (projeção mensal)</Label>
          <Input
            className="w-[200px]"
            value={variableProjection}
            onChange={(e) => setVariableProjection(e.target.value)}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">
            Valor aplicado em cada mês quando não houver lançamento por categoria
          </p>
        </div>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}
