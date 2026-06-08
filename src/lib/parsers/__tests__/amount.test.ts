import { describe, expect, it } from "vitest";
import { parseBrazilianAmount } from "@/lib/parsers/amount";

describe("parseBrazilianAmount", () => {
  it("parses dot and comma formats", () => {
    expect(parseBrazilianAmount("90.00")).toBe(9000);
    expect(parseBrazilianAmount("35,00")).toBe(3500);
    expect(parseBrazilianAmount("- 3.744,93")).toBe(-374493);
    expect(parseBrazilianAmount("1.929,23")).toBe(192923);
  });
});
