"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function PersonOwedChart({
  data,
}: {
  data: { name: string; color: string; total: number }[];
}) {
  const totalOwed = data.reduce((sum, item) => sum + item.total, 0);
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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>A receber este mês</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Valores atribuídos a outras pessoas para reembolso
            </p>
          </div>
          {totalOwed > 0 ? (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(totalOwed)}
              </p>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum reembolso atribuído neste período.
          </p>
        ) : (
          <>
            <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
            <ChartContainer config={config} className="aspect-[16/9] w-full max-h-[240px]">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value) * 100)}
                    />
                  }
                />
                <Bar dataKey="value" radius={4}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
