"use client";

import { Cell, Pie, PieChart } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function CategoryPieChart({
  data,
}: {
  data: { name: string; color: string; total: number }[];
}) {
  const chartData = data.map((item) => ({
    name: item.name,
    value: item.total / 100,
    fill: item.color,
  }));

  const config = Object.fromEntries(
    data.map((item) => [item.name, { label: item.name, color: item.color }])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum gasto classificado neste período.
          </p>
        ) : (
          <ChartContainer config={config} className="mx-auto aspect-square max-h-[300px]">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value) * 100)}
                  />
                }
              />
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
