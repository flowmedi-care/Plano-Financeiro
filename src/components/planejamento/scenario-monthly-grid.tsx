"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveScenarioMonthValues } from "@/lib/actions/projection-scenarios";
import { centsToMoneyInput, formatCurrency, parseMoneyInputToCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function ScenarioMonthlyGrid({
  scenarioId,
  months,
  values,
}: {
  scenarioId: string;
  months: string[];
  values: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localValues, setLocalValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const month of months) {
      const cents = values[month];
      out[month] = cents ? centsToMoneyInput(cents) : "";
    }
    return out;
  });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const out: Record<string, string> = {};
    for (const month of months) {
      const cents = values[month];
      out[month] = cents ? centsToMoneyInput(cents) : "";
    }
    setLocalValues(out);
    setIsDirty(false);
  }, [months, values, scenarioId]);

  function handleSave() {
    const cells = months.map((month) => {
      const raw = localValues[month]?.trim() ?? "";
      return {
        referenceMonth: month,
        amountCents: raw ? parseMoneyInputToCents(raw) : null,
      };
    });

    startTransition(async () => {
      try {
        await saveScenarioMonthValues(scenarioId, cells);
        setIsDirty(false);
        toast.success("Valores mensais salvos");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao salvar");
      }
    });
  }

  function handleDiscard() {
    const out: Record<string, string> = {};
    for (const month of months) {
      const cents = values[month];
      out[month] = cents ? centsToMoneyInput(cents) : "";
    }
    setLocalValues(out);
    setIsDirty(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Preencha o valor de despesas variáveis para cada mês.
        </p>
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
            {pending ? "Salvando..." : "Salvar grade"}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {months.map((month) => (
                <TableHead key={month} className="min-w-[100px] text-right">
                  {formatMonthShort(month)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {months.map((month) => (
                <TableCell key={month} className="p-1 text-right">
                  <Input
                    className="h-8 w-[96px] text-right text-sm"
                    placeholder="—"
                    disabled={pending}
                    value={localValues[month] ?? ""}
                    onChange={(e) => {
                      setLocalValues((prev) => ({ ...prev, [month]: e.target.value }));
                      setIsDirty(true);
                    }}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Total anual:{" "}
        {formatCurrency(
          months.reduce((sum, month) => {
            const raw = localValues[month]?.trim() ?? "";
            return sum + (raw ? parseMoneyInputToCents(raw) : 0);
          }, 0)
        )}
      </p>
    </div>
  );
}
