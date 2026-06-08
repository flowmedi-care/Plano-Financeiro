import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { parseNubankCsv } from "@/lib/parsers/nubank-csv";

const desktopPath = "C:/Users/Daniel Ranna/Desktop";

describe("parseNubankCsv", () => {
  it("parses standard dot-decimal format", () => {
    const content = readFileSync(
      join(desktopPath, "Nubank_2026-05-07.csv"),
      "utf-8"
    );
    const result = parseNubankCsv(content);

    expect(result.transactions.length).toBeGreaterThan(0);
    expect(result.transactions.some((tx) => tx.description.includes("Turmadamonica"))).toBe(
      true
    );
    expect(
      result.transactions.find((tx) => tx.description.includes("Parcela 1/12"))
    ).toMatchObject({
      installmentCurrent: 1,
      installmentTotal: 12,
    });
    expect(
      result.transactions.find((tx) => tx.description.toLowerCase().includes("pagamento recebido"))
    ).toMatchObject({ isPayment: true });
  });

  it("parses quoted brazilian format", () => {
    const content = readFileSync(
      join(desktopPath, "Nubank_2026-06-07.csv"),
      "utf-8"
    );
    const result = parseNubankCsv(content);

    expect(result.transactions.length).toBeGreaterThan(0);
    expect(result.transactions.some((tx) => tx.description.includes("Canva"))).toBe(true);
    expect(result.transactions.some((tx) => tx.isIof)).toBe(true);
    expect(
      result.transactions.find((tx) => tx.description.includes("Ticketmaster"))
    ).toMatchObject({
      installmentCurrent: 7,
      installmentTotal: 11,
      amountCents: 21276,
    });
  });
});
