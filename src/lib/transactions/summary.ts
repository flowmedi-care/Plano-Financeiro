import type { Person, Transaction } from "@/types/database";

export interface PersonOwedSummary {
  personId: string;
  name: string;
  color: string;
  total: number;
}

export interface TransactionSummary {
  itauTotal: number;
  nubankTotal: number;
  grandTotal: number;
  totalOwed: number;
  selfTotal: number;
  byPerson: PersonOwedSummary[];
}

export interface CategorySpending {
  name: string;
  color: string;
  total: number;
}

export interface CategorySpendingDetail extends CategorySpending {
  categoryId: string | null;
}

export interface CategoryMonthComparison {
  categoryId: string | null;
  name: string;
  color: string;
  currentTotal: number;
  previousTotal: number;
  delta: number;
}

export function formatReferenceMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function computeSpendingByCategoryDetailed(
  transactions: Transaction[]
): CategorySpendingDetail[] {
  const map = new Map<string, CategorySpendingDetail>();

  for (const tx of transactions) {
    const key = tx.category_id ?? "__uncategorized__";
    const current = map.get(key) ?? {
      categoryId: tx.category_id,
      name: tx.category?.name ?? "Sem categoria",
      color: tx.category?.color ?? "#94a3b8",
      total: 0,
    };
    current.total += tx.amount_cents;
    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function computeMonthOverMonthComparison(
  current: CategorySpendingDetail[],
  previous: CategorySpendingDetail[]
): CategoryMonthComparison[] {
  const previousMap = new Map(
    previous.map((item) => [item.categoryId ?? "__uncategorized__", item])
  );
  const keys = new Set([
    ...current.map((item) => item.categoryId ?? "__uncategorized__"),
    ...previous.map((item) => item.categoryId ?? "__uncategorized__"),
  ]);

  const results: CategoryMonthComparison[] = [];

  for (const key of keys) {
    const currentItem = current.find(
      (item) => (item.categoryId ?? "__uncategorized__") === key
    );
    const previousItem = previousMap.get(key);
    const currentTotal = currentItem?.total ?? 0;
    const previousTotal = previousItem?.total ?? 0;

    results.push({
      categoryId: key === "__uncategorized__" ? null : key,
      name: currentItem?.name ?? previousItem?.name ?? "Sem categoria",
      color: currentItem?.color ?? previousItem?.color ?? "#94a3b8",
      currentTotal,
      previousTotal,
      delta: currentTotal - previousTotal,
    });
  }

  return results.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function getTransactionReferenceMonth(tx: Transaction): string {
  return tx.reference_month ?? tx.transaction_date.slice(0, 7);
}

export function computeSpendingByCategory(
  transactions: Transaction[]
): CategorySpending[] {
  const map = new Map<string, CategorySpending>();

  for (const tx of transactions) {
    const key = tx.category_id ?? "__uncategorized__";
    const current = map.get(key) ?? {
      name: tx.category?.name ?? "Sem categoria",
      color: tx.category?.color ?? "#94a3b8",
      total: 0,
    };
    current.total += tx.amount_cents;
    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export interface PersonOwedTransaction {
  transaction: Transaction;
  owedCents: number;
}

export function getPersonOwedTransactions(
  transactions: Transaction[],
  personId: string
): PersonOwedTransaction[] {
  return transactions
    .map((tx) => {
      const split = tx.splits?.find((s) => s.person_id === personId);
      if (!split) return null;
      return { transaction: tx, owedCents: split.amount_cents };
    })
    .filter((item): item is PersonOwedTransaction => item !== null)
    .sort((a, b) =>
      b.transaction.transaction_date.localeCompare(a.transaction.transaction_date)
    );
}

export interface SelfTransaction {
  transaction: Transaction;
  selfCents: number;
}

export function getSelfTransactions(transactions: Transaction[]): SelfTransaction[] {
  return transactions
    .map((tx) => {
      const owedToOthers = (tx.splits ?? []).reduce(
        (sum, split) => sum + split.amount_cents,
        0
      );
      const selfCents = tx.amount_cents - owedToOthers;
      if (selfCents <= 0) return null;
      return { transaction: tx, selfCents };
    })
    .filter((item): item is SelfTransaction => item !== null)
    .sort((a, b) =>
      b.transaction.transaction_date.localeCompare(a.transaction.transaction_date)
    );
}

export function computeSelfByCategory(
  selfTransactions: SelfTransaction[]
): CategorySpending[] {
  const map = new Map<string, CategorySpending>();

  for (const { transaction: tx, selfCents } of selfTransactions) {
    const key = tx.category_id ?? "__uncategorized__";
    const current = map.get(key) ?? {
      name: tx.category?.name ?? "Sem categoria",
      color: tx.category?.color ?? "#94a3b8",
      total: 0,
    };
    current.total += selfCents;
    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export interface CategoryTransactionGroup {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  transactions: Transaction[];
}

export function groupTransactionsByCategory(
  transactions: Transaction[]
): CategoryTransactionGroup[] {
  const map = new Map<string, CategoryTransactionGroup>();

  for (const tx of transactions) {
    const categoryId = tx.category_id ?? "__uncategorized__";
    const current = map.get(categoryId) ?? {
      categoryId,
      name: tx.category?.name ?? "Sem categoria",
      color: tx.category?.color ?? "#94a3b8",
      total: 0,
      transactions: [],
    };
    current.total += tx.amount_cents;
    current.transactions.push(tx);
    map.set(categoryId, current);
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      transactions: group.transactions.sort((a, b) =>
        b.transaction_date.localeCompare(a.transaction_date)
      ),
    }))
    .sort((a, b) => b.total - a.total);
}

export function computeOwedByCategory(
  owedTransactions: PersonOwedTransaction[]
): CategorySpending[] {
  const map = new Map<string, CategorySpending>();

  for (const { transaction: tx, owedCents } of owedTransactions) {
    const key = tx.category_id ?? "__uncategorized__";
    const current = map.get(key) ?? {
      name: tx.category?.name ?? "Sem categoria",
      color: tx.category?.color ?? "#94a3b8",
      total: 0,
    };
    current.total += owedCents;
    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function computeTransactionSummary(
  transactions: Transaction[],
  people: Person[] = []
): TransactionSummary {
  let itauTotal = 0;
  let nubankTotal = 0;
  let grandTotal = 0;
  let totalOwed = 0;
  const personMap = new Map<string, PersonOwedSummary>();

  for (const person of people) {
    personMap.set(person.id, {
      personId: person.id,
      name: person.name,
      color: person.color,
      total: 0,
    });
  }

  for (const tx of transactions) {
    grandTotal += tx.amount_cents;

    if (tx.account?.bank === "itau") {
      itauTotal += tx.amount_cents;
    } else if (tx.account?.bank === "nubank") {
      nubankTotal += tx.amount_cents;
    }

    for (const split of tx.splits ?? []) {
      totalOwed += split.amount_cents;
      const personId = split.person_id;
      const existing = personMap.get(personId) ?? {
        personId,
        name: split.person?.name ?? "Pessoa",
        color: split.person?.color ?? "#64748b",
        total: 0,
      };
      existing.total += split.amount_cents;
      personMap.set(personId, existing);
    }
  }

  const byPerson = Array.from(personMap.values())
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    itauTotal,
    nubankTotal,
    grandTotal,
    totalOwed,
    selfTotal: grandTotal - totalOwed,
    byPerson,
  };
}
