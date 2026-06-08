import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { parseItauPdfText } from "@/lib/parsers/itau-pdf";

const desktopPath = "C:/Users/Daniel Ranna/Desktop";

describe("parseItauPdfText", () => {
  it("extracts current invoice transactions without future installments", async () => {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = readFileSync(
      join(desktopPath, "Fatura_Itau_20260608-100743.pdf")
    );
    const data = await pdfParse(buffer);
    const result = parseItauPdfText(data.text);

    const total = result.transactions
      .filter((tx) => !tx.isPayment)
      .reduce((sum, tx) => sum + tx.amountCents, 0);

    expect(result.transactions.length).toBe(25);
    expect(total).toBe(192900);
    expect(result.referenceMonth).toBe("2026-05");
    expect(
      result.transactions.some((tx) => tx.description.includes("BELLAPIZZARIA"))
    ).toBe(true);
    expect(
      result.transactions.filter((tx) => tx.description.includes("AMERICANAS"))
    ).toHaveLength(1);
    expect(
      result.transactions.find((tx) => tx.description.includes("AMERICANAS"))
    ).toMatchObject({
      installmentCurrent: 1,
      installmentTotal: 3,
    });
    expect(result.installmentProjections.length).toBeGreaterThanOrEqual(2);
    expect(result.detectedCards?.length).toBeGreaterThan(0);
  });
});
