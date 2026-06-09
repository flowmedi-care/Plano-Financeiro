"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import { buildYAxisScale } from "@/lib/charts/y-axis-scale";
import { cn, formatCurrency } from "@/lib/utils";
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

function formatAxisCurrency(value: number, step: YAxisStep): string {
  if (step === 5000) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return formatCurrency(value * 100);
}

export function CashFlowBalanceChart({
  projections,
  defaultYAxisStep = 20000,
}: {
  projections: MonthProjection[];
  defaultYAxisStep?: YAxisStep;
}) {
  const [yAxisStep, setYAxisStep] = useState<YAxisStep>(defaultYAxisStep);

  useEffect(() => {
    setYAxisStep(defaultYAxisStep);
  }, [defaultYAxisStep]);

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
        <ChartContainer
          config={config}
          className={cn(
            "w-full",
            yAxisStep === 5000 ? "h-[380px]" : yAxisStep === 10000 ? "h-[320px]" : "h-[280px]"
          )}
        >
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              type="number"
              domain={yAxisScale.domain}
              tickCount={yAxisScale.tickCount}
              allowDecimals={false}
              width={yAxisStep === 5000 ? 72 : 64}
              tickFormatter={(value) => formatAxisCurrency(Number(value), yAxisStep)}
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
