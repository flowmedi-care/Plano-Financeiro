"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toReferenceMonth } from "@/lib/utils";

export function MonthNavigator({ year, month }: { year: number; month: number }) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" asChild>
        <Link href={`/planejamento?year=${prevYear}&month=${prevMonth}`}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>
      <span className="min-w-[160px] text-center font-medium capitalize">{label}</span>
      <Button variant="outline" size="icon" asChild>
        <Link href={`/planejamento?year=${nextYear}&month=${nextMonth}`}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
      <span className="text-xs text-muted-foreground">{toReferenceMonth(year, month)}</span>
    </div>
  );
}
