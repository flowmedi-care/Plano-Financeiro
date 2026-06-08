import { describe, expect, it } from "vitest";
import { parseMoneyInputToCents } from "@/lib/utils";

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
