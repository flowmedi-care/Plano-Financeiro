import { describe, expect, it } from "vitest";
import {
  selfShareCents,
  splitEqually,
  splitEquallyAmongOthers,
  splitFull,
  splitsFromRule,
  validateSplits,
} from "@/lib/splits/calculate";

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

describe("splitEquallyAmongOthers", () => {
  it("splits 50/50 when one other person is selected", () => {
    const result = splitEquallyAmongOthers(100, ["namorada"]);
    expect(result).toEqual([{ personId: "namorada", amountCents: 50 }]);
    expect(selfShareCents(100, result)).toBe(50);
  });

  it("splits among two others plus self", () => {
    const result = splitEquallyAmongOthers(100, ["pai", "namorada"]);
    const sum = result.reduce((s, r) => s + r.amountCents, 0);
    expect(sum).toBe(67);
    expect(selfShareCents(100, result)).toBe(33);
    expect(result).toHaveLength(2);
  });

  it("handles odd cents with one other person", () => {
    const result = splitEquallyAmongOthers(10001, ["namorada"]);
    expect(result).toEqual([{ personId: "namorada", amountCents: 5001 }]);
    expect(selfShareCents(10001, result)).toBe(5000);
  });
});

describe("splitsFromRule", () => {
  it("applies full rule", () => {
    expect(splitsFromRule(9000, "full", ["pai"])).toEqual([
      { personId: "pai", amountCents: 9000 },
    ]);
  });

  it("applies equal rule including self", () => {
    const result = splitsFromRule(100, "equal", ["namorada"]);
    expect(result).toEqual([{ personId: "namorada", amountCents: 50 }]);
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
