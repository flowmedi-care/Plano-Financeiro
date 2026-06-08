"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { MonthProjection } from "@/lib/cash-flow/project";

const Y_AXIS_STEPS = [
  { value: 5000, label: "5 mil" },
  { value: 10000, label: "10 mil" },
  { value: 20000, label: "20 mil" },
] as const;

type YAxisStep = (typeof Y_AXIS_STEPS)[number]["value"];

function buildYAxisScale(values: number[], step: YAxisStep) {
  const dataMin = values.length > 0 ? Math.min(...values) : 0;
  const dataMax = values.length > 0 ? Math.max(...values) : 0;

  let domainMin = Math.floor(Math.min(dataMin, 0) / step) * step;
  let domainMax = Math.ceil(Math.max(dataMax, 0) / step) * step;

  if (domainMin === domainMax) {
    domainMin -= step;
    domainMax += step;
  }

  const ticks: number[] = [];
  for (let tick = domainMin; tick <= domainMax; tick += step) {
    ticks.push(tick);
  }

  return { domain: [domainMin, domainMax] as [number, number], ticks };
}

export function CashFlowBalanceChart({
  projections,
}: {
  projections: MonthProjection[];
}) {
  const [yAxisStep, setYAxisStep] = useState<YAxisStep>(20000);

  const chartData = projections.map((p) => ({
    month: p.referenceMonth.slice(5) + "/" + p.referenceMonth.slice(2, 4),
    acumulado: p.cumulativeBalanceCents / 100,
    mes: p.monthBalanceCents / 100,
  }));

  const yAxisScale = useMemo(
    () => buildYAxisScale(chartData.map((d) => d.acumulado), yAxisStep),
    [chartData, yAxisStep]
  );

  const config = {
    acumulado: { label: "Saldo acumulado", color: "hsl(var(--chart-1))" },
    mes: { label: "Saldo do mês", color: "hsl(var(--chart-2))" },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle>Saldo acumulado</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Escala:</span>
          {Y_AXIS_STEPS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={yAxisStep === option.value ? "default" : "outline"}
              onClick={() => setYAxisStep(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[280px] w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              domain={yAxisScale.domain}
              ticks={yAxisScale.ticks}
              allowDecimals={false}
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
