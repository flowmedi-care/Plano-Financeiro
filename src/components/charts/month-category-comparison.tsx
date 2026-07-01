"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import type { Person, Transaction } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import {
  computeScopedMonthComparison,
  formatReferenceMonthLabel,
  formatReferenceMonthShort,
  type MonthComparisonScope,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BAR_PREVIOUS = "#93c5ad";
const BAR_CURRENT = "#2d8a5e";

export type ComparisonScopeValue = "self" | "all" | `person:${string}`;

function scopeFromValue(value: ComparisonScopeValue): MonthComparisonScope {
  if (value === "self") return { type: "self" };
  if (value === "all") return { type: "all" };
  return { type: "person", personId: value.replace("person:", "") };
}

function scopeLabel(
  value: ComparisonScopeValue,
  people: Person[]
): string {
  if (value === "self") return "só eu";
  if (value === "all") return "fatura inteira";
  const personId = value.replace("person:", "");
  return people.find((p) => p.id === personId)?.name ?? "pessoa";
}

export function MonthCategoryComparisonSection({
  allTransactions,
  people,
  currentMonth,
  previousMonth,
  defaultScope = "self",
  fixedScope,
  title = "Comparação entre faturas",
  hideFilter = false,
}: {
  allTransactions: Transaction[];
  people: Person[];
  currentMonth: string;
  previousMonth: string;
  defaultScope?: ComparisonScopeValue;
  fixedScope?: ComparisonScopeValue;
  title?: string;
  hideFilter?: boolean;
}) {
  const [scope, setScope] = useState<ComparisonScopeValue>(defaultScope);
  const activeScope = fixedScope ?? scope;

  const items = useMemo(
    () =>
      computeScopedMonthComparison(
        allTransactions,
        currentMonth,
        previousMonth,
        scopeFromValue(activeScope)
      ),
    [allTransactions, currentMonth, previousMonth, activeScope]
  );

  const peopleWithSplits = useMemo(() => {
    const ids = new Set<string>();
    for (const tx of allTransactions) {
      for (const split of tx.splits ?? []) {
        ids.add(split.person_id);
      }
    }
    return people.filter((p) => ids.has(p.id));
  }, [allTransactions, people]);

  const scopeDescription = scopeLabel(activeScope, people);

  return (
    <MonthCategoryComparisonChart
      currentMonth={currentMonth}
      previousMonth={previousMonth}
      items={items}
      title={title}
      description={`${formatReferenceMonthLabel(currentMonth)} vs. ${formatReferenceMonthLabel(previousMonth)} — ${scopeDescription}`}
      headerAction={
        hideFilter ? null : (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Ver gastos de</Label>
            <Select
              value={activeScope}
              onValueChange={(value) => setScope(value as ComparisonScopeValue)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Só eu</SelectItem>
                <SelectItem value="all">Fatura inteira</SelectItem>
                {peopleWithSplits.map((person) => (
                  <SelectItem key={person.id} value={`person:${person.id}`}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      }
    />
  );
}

export function MonthCategoryComparisonChart({
  currentMonth,
  previousMonth,
  items,
  title = "Comparação entre faturas",
  description,
  headerAction,
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
  headerAction?: React.ReactNode;
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
      color: BAR_PREVIOUS,
    },
    [currentKey]: {
      label: currentFullLabel,
      color: BAR_CURRENT,
    },
  } satisfies ChartConfig;

  const visibleItems = items.filter(
    (item) => item.currentTotal > 0 || item.previousTotal > 0
  );

  const chartData = visibleItems.map((item) => ({
    category: item.name,
    [previousKey]: item.previousTotal / 100,
    [currentKey]: item.currentTotal / 100,
    delta: item.delta,
  }));

  const chartMinWidth = Math.max(320, chartData.length * 72);

  const currentGrandTotal = visibleItems.reduce(
    (sum, item) => sum + item.currentTotal,
    0
  );
  const previousGrandTotal = visibleItems.reduce(
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
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description ??
              `${currentFullLabel} vs. ${previousFullLabel} — gasto por categoria`}
          </CardDescription>
        </div>
        {headerAction}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem dados para comparar neste filtro.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[260px] w-full"
                style={{ minWidth: chartMinWidth }}
              >
              <BarChart accessibilityLayer data={chartData} margin={{ bottom: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  tickMargin={8}
                  axisLine={false}
                  interval={0}
                  tickFormatter={(value: string) =>
                    value.length > 10 ? `${value.slice(0, 9)}…` : value
                  }
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(value: number) =>
                    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
                  }
                  fontSize={11}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) =>
                    chartConfig[value as keyof typeof chartConfig]?.label ?? value
                  }
                />
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
                  fill={BAR_PREVIOUS}
                  radius={4}
                  maxBarSize={28}
                />
                <Bar
                  dataKey={currentKey}
                  fill={BAR_CURRENT}
                  radius={4}
                  maxBarSize={28}
                />
              </BarChart>
            </ChartContainer>
            </div>

            <div className="space-y-2">
              {visibleItems.map((item) => {
                const sign = item.delta > 0 ? "+" : item.delta < 0 ? "−" : "";
                const deltaClass =
                  item.delta > 0
                    ? "text-emerald-600"
                    : item.delta < 0
                      ? "text-destructive"
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
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </>
            ) : (
              <>
                {totalDeltaPct
                  ? `${Math.abs(Number(totalDeltaPct))}% a menos que ${previousLabel}`
                  : `Menos que ${previousLabel}`}{" "}
                <TrendingDown className="h-4 w-4 text-destructive" />
              </>
            )}
          </div>
          <div className="leading-none text-muted-foreground">
            {formatCurrency(previousGrandTotal)} ({previousLabel}) →{" "}
            {formatCurrency(currentGrandTotal)} ({currentLabel})
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
