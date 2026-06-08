"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MonthProjection } from "@/lib/cash-flow/project";

export function CashFlowBalanceChart({
  projections,
}: {
  projections: MonthProjection[];
}) {
  const chartData = projections.map((p) => ({
    month: p.referenceMonth.slice(5) + "/" + p.referenceMonth.slice(2, 4),
    acumulado: p.cumulativeBalanceCents / 100,
    mes: p.monthBalanceCents / 100,
  }));

  const config = {
    acumulado: { label: "Saldo acumulado", color: "hsl(var(--chart-1))" },
    mes: { label: "Saldo do mês", color: "hsl(var(--chart-2))" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo acumulado</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[280px] w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(v) => formatCurrency(Number(v) * 100)}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value) * 100)}
                />
              }
            />
            <Bar dataKey="acumulado" fill="var(--color-acumulado)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
