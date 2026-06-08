import { describe, expect, it } from "vitest";
import {
  computeOwedByCategory,
  computeSelfByCategory,
  computeSpendingByCategory,
  computeTransactionSummary,
  getPersonOwedTransactions,
  getSelfTransactions,
  groupTransactionsByCategory,
} from "@/lib/transactions/summary";
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
    transaction_date: "2026-05-10",
    category_id: "cat1",
    category: { name: "Alimentação", color: "#f00" },
    account: { bank: "itau" as const, name: "Itaú" },
    splits: [{ person_id: "pai", amount_cents: 5000, person: people[0] }],
  },
  {
    id: "2",
    amount_cents: 5000,
    transaction_date: "2026-05-05",
    category_id: "cat2",
    category: { name: "Lazer", color: "#0f0" },
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

describe("computeSpendingByCategory", () => {
  it("sums full transaction amounts by category", () => {
    const result = computeSpendingByCategory(transactions);
    expect(result.reduce((s, item) => s + item.total, 0)).toBe(15000);
  });
});

describe("getPersonOwedTransactions", () => {
  it("returns only transactions with split for person", () => {
    const result = getPersonOwedTransactions(transactions, "pai");
    expect(result).toHaveLength(1);
    expect(result[0].owedCents).toBe(5000);
  });
});

describe("computeOwedByCategory", () => {
  it("sums owed amounts by category", () => {
    const owed = getPersonOwedTransactions(transactions, "pai");
    const result = computeOwedByCategory(owed);
    expect(result[0].total).toBe(5000);
  });
});

describe("getSelfTransactions", () => {
  it("returns self share after splits", () => {
    const result = getSelfTransactions(transactions);
    expect(result).toHaveLength(2);
    expect(result.reduce((s, item) => s + item.selfCents, 0)).toBe(7500);
  });
});

describe("computeSelfByCategory", () => {
  it("groups self spending by category", () => {
    const self = getSelfTransactions(transactions);
    const result = computeSelfByCategory(self);
    expect(result.reduce((s, item) => s + item.total, 0)).toBe(7500);
  });
});

describe("groupTransactionsByCategory", () => {
  it("groups transactions with totals", () => {
    const result = groupTransactionsByCategory(transactions);
    expect(result.length).toBeGreaterThan(0);
    expect(result.reduce((s, g) => s + g.transactions.length, 0)).toBe(2);
  });
});
