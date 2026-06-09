"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProjectionScenario } from "@/lib/actions/projection-scenarios";
import type { ProjectionScenarioType } from "@/types/database";
import type { ProjectionScenarioWithValues } from "@/lib/cash-flow/scenario-variable";
import { centsToMoneyInput, parseMoneyInputToCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScenarioMonthlyGrid } from "@/components/planejamento/scenario-monthly-grid";

export function ScenarioEditor({
  scenario,
  months,
  monthValues,
}: {
  scenario: ProjectionScenarioWithValues;
  months: string[];
  monthValues: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(scenario.name);
  const [type, setType] = useState<ProjectionScenarioType>(scenario.type);
  const [fixedAmount, setFixedAmount] = useState(
    centsToMoneyInput(scenario.fixed_amount_cents ?? 0)
  );

  useEffect(() => {
    setName(scenario.name);
    setType(scenario.type);
    setFixedAmount(centsToMoneyInput(scenario.fixed_amount_cents ?? 0));
  }, [scenario]);

  function handleSaveMeta() {
    startTransition(async () => {
      try {
        await updateProjectionScenario({
          id: scenario.id,
          name,
          type,
          fixedAmountCents:
            type === "fixed" ? parseMoneyInputToCents(fixedAmount) : null,
        });
        toast.success("Cenário atualizado");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao salvar");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Nome do cenário</Label>
          <Input
            className="w-[220px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={type === "fixed" ? "default" : "outline"}
              onClick={() => setType("fixed")}
            >
              Fixo (mesmo valor/mês)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={type === "monthly" ? "default" : "outline"}
              onClick={() => setType("monthly")}
            >
              Mês a mês
            </Button>
          </div>
        </div>
        <Button onClick={handleSaveMeta} disabled={pending}>
          {pending ? "Salvando..." : "Salvar cenário"}
        </Button>
      </div>

      {type === "fixed" ? (
        <div className="space-y-2">
          <Label>Despesas variáveis (projeção mensal)</Label>
          <div className="flex items-end gap-2">
            <Input
              className="w-[200px]"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              placeholder="0,00"
            />
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await updateProjectionScenario({
                      id: scenario.id,
                      fixedAmountCents: parseMoneyInputToCents(fixedAmount),
                    });
                    toast.success("Valor fixo salvo");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Erro");
                  }
                });
              }}
            >
              Salvar valor
            </Button>
          </div>
        </div>
      ) : (
        <ScenarioMonthlyGrid
          scenarioId={scenario.id}
          months={months}
          values={monthValues}
        />
      )}
    </div>
  );
}
