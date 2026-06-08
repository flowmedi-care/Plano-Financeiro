import { describe, expect, it } from "vitest";
import { formatReferenceMonthLabel, parseMoneyInputToCents } from "@/lib/utils";

describe("formatReferenceMonthLabel", () => {
  it("appends capitalized month name in pt-BR", () => {
    expect(formatReferenceMonthLabel("2026-06")).toBe("2026-06 Junho");
    expect(formatReferenceMonthLabel("2027-01")).toBe("2027-01 Janeiro");
  });
});

describe("parseMoneyInputToCents", () => {
  it("parses negative values with dot decimal", () => {
    expect(parseMoneyInputToCents("-4500.00")).toBe(-450000);
    expect(parseMoneyInputToCents("-4500")).toBe(-450000);
  });

  it("parses negative values with comma decimal", () => {
    expect(parseMoneyInputToCents("-4500,00")).toBe(-450000);
  });

  it("parses brazilian thousands format", () => {
    expect(parseMoneyInputToCents("5.000,00")).toBe(500000);
  });
});
