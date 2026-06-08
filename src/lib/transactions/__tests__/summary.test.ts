import { describe, expect, it } from "vitest";
import { computeTransactionSummary } from "@/lib/transactions/summary";
import type { Person, Transaction } from "@/types/database";

const people: Person[] = [
  {
    id: "pai",
    user_id: "u1",
    household_id: null,
    scope: "personal",
    name: "Pai",
    color: "#f00",
    created_at: "",
  },
  {
    id: "namorada",
    user_id: "u1",
    household_id: null,
    scope: "personal",
    name: "Namorada",
    color: "#0f0",
    created_at: "",
  },
];

const transactions = [
  {
    id: "1",
    amount_cents: 10000,
    account: { bank: "itau" as const, name: "Itaú" },
    splits: [{ person_id: "pai", amount_cents: 5000, person: people[0] }],
  },
  {
    id: "2",
    amount_cents: 5000,
    account: { bank: "nubank" as const, name: "Nubank" },
    splits: [{ person_id: "namorada", amount_cents: 2500, person: people[1] }],
  },
] as Transaction[];

describe("computeTransactionSummary", () => {
  it("aggregates by bank and person", () => {
    const summary = computeTransactionSummary(transactions, people);
    expect(summary.itauTotal).toBe(10000);
    expect(summary.nubankTotal).toBe(5000);
    expect(summary.grandTotal).toBe(15000);
    expect(summary.totalOwed).toBe(7500);
    expect(summary.selfTotal).toBe(7500);
    expect(summary.byPerson).toHaveLength(2);
  });
});
