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
  const grandTotal = data.reduce((sum, item) => sum + item.total, 0);
  const chartData = data.map((item) => ({
    name: item.name,
    value: item.total / 100,
    fill: item.color,
    total: item.total,
  }));

  const config = Object.fromEntries(
    data.map((item) => [item.name, { label: item.name, color: item.color }])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoria</CardTitle>
        <p className="text-sm text-muted-foreground">
          Valor integral da fatura — independente de reembolsos
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum gasto neste período.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartContainer config={config} className="mx-auto aspect-square max-h-[280px]">
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
            <div className="space-y-2">
              {chartData.map((item) => {
                const pct = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : "0";
                return (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                      <span className="ml-2 text-muted-foreground">{pct}%</span>
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
