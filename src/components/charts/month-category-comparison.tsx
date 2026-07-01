"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { formatReferenceMonthLabel } from "@/lib/transactions/summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function MonthCategoryComparisonChart({
  currentMonth,
  previousMonth,
  items,
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
}) {
  const chartData = items
    .filter((item) => item.delta !== 0 || item.currentTotal > 0 || item.previousTotal > 0)
    .slice(0, 10)
    .map((item) => ({
      category: item.name,
      variacao: item.delta / 100,
      delta: item.delta,
      color: item.color,
    }));

  const currentLabel = formatReferenceMonthLabel(currentMonth);
  const previousLabel = formatReferenceMonthLabel(previousMonth);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação entre faturas</CardTitle>
        <p className="text-sm text-muted-foreground">
          {currentLabel} vs. {previousLabel} — variação por categoria
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem dados para comparar entre os dois meses.
          </p>
        ) : (
          <div className="space-y-6">
            <ChartContainer
              config={{
                variacao: { label: "Variação", color: "hsl(var(--chart-2))" },
              }}
              className="aspect-[16/9] w-full"
            >
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                />
                <ReferenceLine x={0} stroke="hsl(var(--border))" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => {
                        const payload = item.payload as {
                          delta: number;
                          category: string;
                        };
                        const sign = payload.delta > 0 ? "+" : "";
                        return `${sign}${formatCurrency(payload.delta)}`;
                      }}
                    />
                  }
                />
                <Bar dataKey="variacao" radius={4}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={entry.delta > 0 ? "hsl(var(--destructive))" : "hsl(142 76% 36%)"}
                    />
                  ))}
                </Bar>
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
                        {formatCurrency(item.previousTotal)} → {formatCurrency(item.currentTotal)}
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
    </Card>
  );
}
