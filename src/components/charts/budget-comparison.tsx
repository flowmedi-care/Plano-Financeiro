"use client";

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function BudgetComparisonChart({
  data,
}: {
  data: { category: string; planned: number; actual: number }[];
}) {
  const chartData = data.map((item) => ({
    category: item.category,
    planejado: item.planned / 100,
    realizado: item.actual / 100,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planejado vs. realizado</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Configure o planejamento para ver a comparação.
          </p>
        ) : (
          <ChartContainer
            config={{
              planejado: { label: "Planejado", color: "hsl(var(--chart-1))" },
              realizado: { label: "Realizado", color: "hsl(var(--chart-3))" },
            }}
            className="aspect-[16/9] w-full"
          >
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="category" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Legend />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value) * 100)}
                  />
                }
              />
              <Bar dataKey="planejado" fill="var(--color-planejado)" radius={4} />
              <Bar dataKey="realizado" fill="var(--color-realizado)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
