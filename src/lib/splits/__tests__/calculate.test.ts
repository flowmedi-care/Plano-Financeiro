import { describe, expect, it } from "vitest";
import { splitEqually, splitFull, validateSplits } from "@/lib/splits/calculate";

describe("splitEqually", () => {
  it("divides equally with odd cents", () => {
    const result = splitEqually(10001, ["a", "b"]);
    expect(result).toEqual([
      { personId: "a", amountCents: 5001 },
      { personId: "b", amountCents: 5000 },
    ]);
  });

  it("divides among three people", () => {
    const result = splitEqually(100, ["a", "b", "c"]);
    const sum = result.reduce((s, r) => s + r.amountCents, 0);
    expect(sum).toBe(100);
    expect(result).toHaveLength(3);
  });
});

describe("splitFull", () => {
  it("assigns full amount to one person", () => {
    expect(splitFull("pai", 9000)).toEqual([{ personId: "pai", amountCents: 9000 }]);
  });
});

describe("validateSplits", () => {
  it("rejects sum exceeding total", () => {
    const result = validateSplits(100, [
      { personId: "a", amountCents: 60 },
      { personId: "b", amountCents: 50 },
    ]);
    expect(result.valid).toBe(false);
  });

  it("accepts partial assignment", () => {
    const result = validateSplits(100, [{ personId: "a", amountCents: 50 }]);
    expect(result.valid).toBe(true);
  });

  it("accepts empty splits", () => {
    expect(validateSplits(100, []).valid).toBe(true);
  });
});
