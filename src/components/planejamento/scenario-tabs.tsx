"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  createProjectionScenario,
  deleteProjectionScenario,
} from "@/lib/actions/projection-scenarios";
import type { MonthProjection } from "@/lib/cash-flow/project";
import type { ProjectionScenarioWithValues } from "@/lib/cash-flow/scenario-variable";
import { ScenarioEditor } from "@/components/planejamento/scenario-editor";
import { ScenarioProjectionView } from "@/components/planejamento/scenario-projection-view";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ScenarioProjectionResult {
  scenario: ProjectionScenarioWithValues;
  projections: MonthProjection[];
  monthValues: Record<string, number>;
}

export function ScenarioTabs({
  scenarios,
  months,
}: {
  scenarios: ScenarioProjectionResult[];
  months: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState(scenarios[0]?.scenario.id ?? "");

  const active =
    scenarios.find((s) => s.scenario.id === activeId) ?? scenarios[0] ?? null;

  function handleCreate() {
    const count = scenarios.length + 1;
    startTransition(async () => {
      try {
        const created = await createProjectionScenario({
          name: `Cenário ${count}`,
          type: "fixed",
          fixedAmountCents: 0,
        });
        setActiveId(created.id);
        router.refresh();
        toast.success("Cenário criado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao criar");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir este cenário?")) return;

    startTransition(async () => {
      try {
        await deleteProjectionScenario(id);
        if (activeId === id) {
          const remaining = scenarios.filter((s) => s.scenario.id !== id);
          setActiveId(remaining[0]?.scenario.id ?? "");
        }
        router.refresh();
        toast.success("Cenário excluído");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao excluir");
      }
    });
  }

  if (scenarios.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          Crie cenários para comparar diferentes níveis de despesas variáveis na projeção.
        </p>
        <Button onClick={handleCreate} disabled={pending}>
          <Plus className="mr-2 h-4 w-4" />
          Criar primeiro cenário
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {scenarios.map(({ scenario }) => (
          <div key={scenario.id} className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={active?.scenario.id === scenario.id ? "default" : "outline"}
              onClick={() => setActiveId(scenario.id)}
            >
              {scenario.name}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={pending}
              onClick={() => handleDelete(scenario.id)}
              title="Excluir cenário"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={handleCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Novo cenário
        </Button>
      </div>

      {active ? (
        <div className={cn(pending && "pointer-events-none opacity-60")}>
          <ScenarioEditor
            scenario={active.scenario}
            months={months}
            monthValues={active.monthValues}
          />
          <div className="mt-6">
            <ScenarioProjectionView projections={active.projections} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
