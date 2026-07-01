"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";
import {
  formatReferenceMonthLabel,
  formatReferenceMonthShort,
} from "@/lib/transactions/summary";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export function MonthCategoryComparisonChart({
  currentMonth,
  previousMonth,
  items,
  title = "Comparação entre faturas",
  description,
}: {
  currentMonth: string;
  previousMonth: string;
  items: {
    name: string;
    color: string;
    currentTotal: number;
    previousTotal: number;
    delta: number;
  }[];
  title?: string;
  description?: string;
}) {
  const previousKey = "anterior";
  const currentKey = "atual";
  const previousLabel = formatReferenceMonthShort(previousMonth);
  const currentLabel = formatReferenceMonthShort(currentMonth);
  const previousFullLabel = formatReferenceMonthLabel(previousMonth);
  const currentFullLabel = formatReferenceMonthLabel(currentMonth);

  const chartConfig = {
    [previousKey]: {
      label: previousFullLabel,
      color: "hsl(var(--chart-1) / 0.38)",
    },
    [currentKey]: {
      label: currentFullLabel,
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  const chartData = items
    .filter(
      (item) =>
        item.delta !== 0 || item.currentTotal > 0 || item.previousTotal > 0
    )
    .slice(0, 10)
    .map((item) => ({
      category: item.name,
      [previousKey]: item.previousTotal / 100,
      [currentKey]: item.currentTotal / 100,
      delta: item.delta,
    }));

  const currentGrandTotal = items.reduce(
    (sum, item) => sum + item.currentTotal,
    0
  );
  const previousGrandTotal = items.reduce(
    (sum, item) => sum + item.previousTotal,
    0
  );
  const totalDelta = currentGrandTotal - previousGrandTotal;
  const totalDeltaPct =
    previousGrandTotal > 0
      ? ((totalDelta / previousGrandTotal) * 100).toFixed(1)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description ??
            `${currentFullLabel} vs. ${previousFullLabel} — gasto por categoria`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem dados para comparar entre os dois meses.
          </p>
        ) : (
          <div className="space-y-6">
            <ChartContainer config={chartConfig} className="aspect-[16/9] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={64}
                />
                <YAxis tickLine={false} axisLine={false} width={72} />
                <Legend />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dashed"
                      formatter={(value) =>
                        formatCurrency(Number(value) * 100)
                      }
                    />
                  }
                />
                <Bar
                  dataKey={previousKey}
                  fill={`var(--color-${previousKey})`}
                  radius={4}
                />
                <Bar
                  dataKey={currentKey}
                  fill={`var(--color-${currentKey})`}
                  radius={4}
                />
              </BarChart>
            </ChartContainer>

            <div className="space-y-2">
              {items.map((item) => {
                const sign = item.delta > 0 ? "+" : item.delta < 0 ? "−" : "";
                const deltaClass =
                  item.delta > 0
                    ? "text-destructive"
                    : item.delta < 0
                      ? "text-emerald-600"
                      : "text-muted-foreground";

                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-right">
                      <span className="text-muted-foreground">
                        {formatCurrency(item.previousTotal)} →{" "}
                        {formatCurrency(item.currentTotal)}
                      </span>
                      <span className={`w-24 font-medium ${deltaClass}`}>
                        {sign}
                        {formatCurrency(Math.abs(item.delta))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
      {chartData.length > 0 && totalDelta !== 0 ? (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            {totalDelta > 0 ? (
              <>
                {totalDeltaPct
                  ? `${totalDeltaPct}% a mais que ${previousLabel}`
                  : `Mais que ${previousLabel}`}{" "}
                <TrendingUp className="h-4 w-4 text-destructive" />
              </>
            ) : (
              <>
                {totalDeltaPct
                  ? `${Math.abs(Number(totalDeltaPct))}% a menos que ${previousLabel}`
                  : `Menos que ${previousLabel}`}{" "}
                <TrendingDown className="h-4 w-4 text-emerald-600" />
              </>
            )}
          </div>
          <div className="text-muted-foreground leading-none">
            {formatCurrency(previousGrandTotal)} ({previousLabel}) →{" "}
            {formatCurrency(currentGrandTotal)} ({currentLabel})
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
