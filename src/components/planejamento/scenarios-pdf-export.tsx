"use client";

import { useTransition } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import type { ScenarioProjectionResult } from "@/components/planejamento/scenario-tabs";
import type { MonthInput } from "@/lib/cash-flow/project";
import { generateScenariosReportPdf } from "@/lib/reports/scenarios-pdf";
import type { Card, CashFlowSettings } from "@/types/database";
import { Button } from "@/components/ui/button";

export function ScenariosPdfExport({
  settings,
  monthInputs,
  scenarios,
  cardGrid,
}: {
  settings: CashFlowSettings;
  monthInputs: MonthInput[];
  scenarios: ScenarioProjectionResult[];
  cardGrid: {
    months: string[];
    cards: Card[];
    values: Record<string, number>;
    totalsByMonth: Record<string, number>;
  };
}) {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    if (scenarios.length === 0) {
      toast.error("Crie pelo menos um cenário para exportar");
      return;
    }

    startTransition(async () => {
      try {
        generateScenariosReportPdf({
          settings,
          monthInputs,
          scenarios,
          cardGrid,
        });
        toast.success("Relatório exportado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao exportar");
      }
    });
  }

  return (
    <Button variant="outline" disabled={pending || scenarios.length === 0} onClick={handleExport}>
      <FileDown className="mr-2 h-4 w-4" />
      {pending ? "Gerando..." : "Exportar relatório de cenários"}
    </Button>
  );
}
