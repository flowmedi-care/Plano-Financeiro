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

export function getTransactionReferenceMonth(tx: Transaction): string {
  return tx.reference_month ?? tx.transaction_date.slice(0, 7);
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
