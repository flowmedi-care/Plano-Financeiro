"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { applyEstimation } from "@/lib/actions/cash-flow";
import type { MonthProjection } from "@/lib/cash-flow/project";
import type { EstimationMethod } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { CashFlowBalanceChart } from "@/components/charts/cash-flow-balance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function CashFlowProjectionTab({
  projections,
  defaultMethod,
}: {
  projections: MonthProjection[];
  defaultMethod: EstimationMethod;
}) {
  const [pending, startTransition] = useTransition();

  const firstPositive = projections.find((p) => p.cumulativeBalanceCents > 0);

  function handleApply(method: EstimationMethod) {
    startTransition(async () => {
      try {
        await applyEstimation(method);
        toast.success("Estimativa aplicada");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estimativa de variáveis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Método atual: <strong>{defaultMethod}</strong>. Aplique para preencher categorias
            &quot;A definir&quot; nos próximos meses.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => handleApply("surplus_allocation")}
          >
            Aplicar superávit acumulado
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => handleApply("historical_avg")}
          >
            Aplicar média histórica (3 meses)
          </Button>
        </CardContent>
      </Card>

      {firstPositive ? (
        <Card>
          <CardContent className="py-4 text-sm">
            Saldo acumulado positivo a partir de{" "}
            <strong>{firstPositive.referenceMonth}</strong> (
            {formatCurrency(firstPositive.cumulativeBalanceCents)}).
          </CardContent>
        </Card>
      ) : null}

      <CashFlowBalanceChart projections={projections} />

      <Card>
        <CardHeader>
          <CardTitle>Fluxo de caixa — {projections.length} meses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Fixos</TableHead>
                <TableHead className="text-right">Cartão</TableHead>
                <TableHead className="text-right">Variáveis</TableHead>
                <TableHead className="text-right">Saldo mês</TableHead>
                <TableHead className="text-right">Acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projections.map((row) => (
                <TableRow key={row.referenceMonth}>
                  <TableCell className="font-medium">{row.referenceMonth}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.incomeCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.fixedCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.cardCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.variableHasUndefined && row.variableCents === 0 ? (
                      <Badge variant="warning">A definir</Badge>
                    ) : (
                      <span className={row.variableEstimated ? "italic text-muted-foreground" : ""}>
                        {formatCurrency(row.variableCents)}
                        {row.variableEstimated ? " *" : ""}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      row.monthBalanceCents >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(row.monthBalanceCents)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      row.cumulativeBalanceCents >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(row.cumulativeBalanceCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="px-4 py-2 text-xs text-muted-foreground">
            * Valor estimado (não confirmado manualmente)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
