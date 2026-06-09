"use client";

import type { MonthProjection } from "@/lib/cash-flow/project";
import { formatCurrency, formatReferenceMonthLabel } from "@/lib/utils";
import { CashFlowBalanceChart } from "@/components/charts/cash-flow-balance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ScenarioProjectionView({
  projections,
}: {
  projections: MonthProjection[];
}) {
  const firstPositive = projections.find((p) => p.cumulativeBalanceCents > 0);

  return (
    <div className="space-y-6">
      {firstPositive ? (
        <Card>
          <CardContent className="py-4 text-sm">
            Saldo acumulado positivo a partir de{" "}
            <strong>{formatReferenceMonthLabel(firstPositive.referenceMonth)}</strong> (
            {formatCurrency(firstPositive.cumulativeBalanceCents)}).
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Saldo acumulado não fica positivo no horizonte da projeção.
          </CardContent>
        </Card>
      )}

      <CashFlowBalanceChart projections={projections} defaultYAxisStep={5000} />

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
                  <TableCell className="font-medium">
                    {formatReferenceMonthLabel(row.referenceMonth)}
                  </TableCell>
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
                    {formatCurrency(row.variableCents)}
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
        </CardContent>
      </Card>
    </div>
  );
}
