"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function ProjectionLineChart({
  data,
}: {
  data: { referenceMonth: string; amountCents: number }[];
}) {
  const chartData = data.map((item) => ({
    month: item.referenceMonth,
    value: item.amountCents / 100,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projeção de parcelas (12 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma parcela ativa para projetar.
          </p>
        ) : (
          <ChartContainer
            config={{ value: { label: "Parcelas", color: "hsl(var(--chart-2))" } }}
            className="aspect-[16/9] w-full"
          >
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value) * 100)}
                  />
                }
              />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
