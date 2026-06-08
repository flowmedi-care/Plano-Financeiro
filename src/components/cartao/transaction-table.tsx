"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { classifyTransactions } from "@/lib/actions/transactions";
import { SplitDialog } from "@/components/cartao/split-dialog";
import { TransactionSummary } from "@/components/cartao/transaction-summary";
import { ReimbursementPdfExport } from "@/components/cartao/reimbursement-pdf-export";
import { CategoryPieChart } from "@/components/charts/category-pie";
import { CategoryTransactionsList } from "@/components/cartao/category-transactions-list";
import {
  computeSpendingByCategory,
  getTransactionReferenceMonth,
} from "@/lib/transactions/summary";
import type { Account, Card as CreditCard, Category, Person, Transaction } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function getLatestReferenceMonth(transactions: Transaction[]): string {
  const months = [
    ...new Set(transactions.map((tx) => getTransactionReferenceMonth(tx))),
  ].sort().reverse();
  return months[0] ?? "all";
}

export function TransactionTable({
  transactions,
  categories,
  accounts,
  cards,
  people,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  cards: CreditCard[];
  people: Person[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [remember, setRemember] = useState(true);
  const [accountFilter, setAccountFilter] = useState("all");
  const [cardFilter, setCardFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(() =>
    getLatestReferenceMonth(transactions)
  );
  const [personFilter, setPersonFilter] = useState("all");
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);
  const [pending, startTransition] = useTransition();

  const months = useMemo(() => {
    const set = new Set(
      transactions.map((tx) => getTransactionReferenceMonth(tx))
    );
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (accountFilter !== "all" && tx.account_id !== accountFilter) return false;
      if (cardFilter !== "all" && tx.card_id !== cardFilter) return false;
      if (
        monthFilter !== "all" &&
        getTransactionReferenceMonth(tx) !== monthFilter
      ) {
        return false;
      }
      if (personFilter === "me" && (tx.splits?.length ?? 0) > 0) return false;
      if (
        personFilter !== "all" &&
        personFilter !== "me" &&
        !tx.splits?.some((s) => s.person_id === personFilter)
      ) {
        return false;
      }
      if (uncategorizedOnly && tx.category_id) return false;
      return true;
    });
  }, [
    transactions,
    accountFilter,
    cardFilter,
    monthFilter,
    personFilter,
    uncategorizedOnly,
  ]);

  const spendingByCategory = useMemo(
    () => computeSpendingByCategory(filtered),
    [filtered]
  );

  function toggleAll(checked: boolean) {
    setSelected(checked ? filtered.map((tx) => tx.id) : []);
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    );
  }

  function handleClassify() {
    if (!categoryId || selected.length === 0) return;

    startTransition(async () => {
      try {
        await classifyTransactions({
          transactionIds: selected,
          categoryId,
          remember,
          accountId: accountFilter !== "all" ? accountFilter : undefined,
        });
        toast.success("Transações classificadas");
        setSelected([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao classificar");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-2">
            <Label>Conta</Label>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cartão</Label>
            <Select value={cardFilter} onValueChange={setCardFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                    {card.last_digits ? ` ·${card.last_digits}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mês da fatura</Label>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pessoa</Label>
            <Select value={personFilter} onValueChange={setPersonFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="me">Só eu</SelectItem>
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Checkbox
              id="uncategorized"
              checked={uncategorizedOnly}
              onCheckedChange={(checked) => setUncategorizedOnly(Boolean(checked))}
            />
            <Label htmlFor="uncategorized">Somente sem categoria</Label>
          </div>
        </CardContent>
      </Card>

      {selected.length > 0 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <span className="text-sm font-medium">{selected.length} selecionadas</span>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(Boolean(checked))}
              />
              <Label htmlFor="remember">Lembrar para este estabelecimento</Label>
            </div>
            <Button onClick={handleClassify} disabled={pending}>
              Aplicar categoria
            </Button>
            <Button variant="outline" onClick={() => setSplitDialogOpen(true)} disabled={pending}>
              Atribuir reembolso
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <SplitDialog
        open={splitDialogOpen}
        onOpenChange={setSplitDialogOpen}
        transactions={filtered.filter((tx) => selected.includes(tx.id))}
        people={people}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                  />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Reembolso</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(tx.id)}
                      onCheckedChange={(checked) => toggleOne(tx.id, Boolean(checked))}
                    />
                  </TableCell>
                  <TableCell>{tx.transaction_date}</TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell>{tx.account?.name ?? "-"}</TableCell>
                  <TableCell>{tx.card?.name ?? "-"}</TableCell>
                  <TableCell>
                    {tx.category ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: tx.category.color }}
                        />
                        <span>{tx.category.name}</span>
                        {tx.auto_categorized ? (
                          <Badge variant="success">auto</Badge>
                        ) : null}
                      </div>
                    ) : (
                      <Badge variant="warning">Sem categoria</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {tx.splits && tx.splits.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tx.splits.map((split) => (
                          <Badge
                            key={split.id}
                            variant="secondary"
                            style={{
                              borderColor: split.person?.color,
                            }}
                          >
                            {split.person?.name} {formatCurrency(split.amount_cents)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tx.installment_current && tx.installment_total
                      ? `${tx.installment_current}/${tx.installment_total}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(tx.amount_cents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CategoryPieChart data={spendingByCategory} />

      <CategoryTransactionsList transactions={filtered} />

      <TransactionSummary
        transactions={filtered}
        people={people}
        monthFilter={monthFilter}
      />

      <ReimbursementPdfExport
        transactions={filtered}
        people={people}
        monthFilter={monthFilter}
      />
    </div>
  );
}
