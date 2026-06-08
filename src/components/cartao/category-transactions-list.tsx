"use client";

import { useState } from "react";
import type { Transaction } from "@/types/database";
import { groupTransactionsByCategory } from "@/lib/transactions/summary";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CategoryTransactionsList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const groups = groupTransactionsByCategory(transactions);

  function toggleCategory(categoryId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(groups.map((g) => g.categoryId)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  if (groups.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Transações por categoria</CardTitle>
          <p className="text-sm text-muted-foreground">
            Expanda cada categoria para ver os lançamentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expandir tudo
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Recolher tudo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {groups.map((group) => {
          const isOpen = expanded.has(group.categoryId);
          const pct =
            transactions.reduce((s, tx) => s + tx.amount_cents, 0) > 0
              ? (
                  (group.total /
                    transactions.reduce((s, tx) => s + tx.amount_cents, 0)) *
                  100
                ).toFixed(1)
              : "0";

          return (
            <div key={group.categoryId} className="rounded-lg border">
              <button
                type="button"
                onClick={() => toggleCategory(group.categoryId)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="font-medium">{group.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {group.transactions.length} lançamentos · {pct}%
                  </span>
                </div>
                <span className="font-medium">{formatCurrency(group.total)}</span>
              </button>

              {isOpen ? (
                <div className="border-t px-4 py-2">
                  <ul className="divide-y">
                    {group.transactions.map((tx) => (
                      <li
                        key={tx.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.transaction_date}
                            {tx.account?.name ? ` · ${tx.account.name}` : ""}
                            {tx.card?.name ? ` · ${tx.card.name}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium">
                          {formatCurrency(tx.amount_cents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
