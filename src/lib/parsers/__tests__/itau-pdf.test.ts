import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { parseItauPdfText } from "@/lib/parsers/itau-pdf";

const desktopPath = "C:/Users/Daniel Ranna/Desktop";

describe("parseItauPdfText", () => {
  it("extracts transactions from real Itau invoice text", async () => {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = readFileSync(
      join(desktopPath, "Fatura_Itau_20260608-100743.pdf")
    );
    const data = await pdfParse(buffer);
    const result = parseItauPdfText(data.text);

    expect(result.transactions.length).toBeGreaterThan(10);
    expect(result.referenceMonth).toBe("2026-05");
    expect(
      result.transactions.some((tx) => tx.description.includes("BELLAPIZZARIA"))
    ).toBe(true);
    expect(
      result.transactions.find((tx) => tx.description.includes("AMERICANAS"))
    ).toMatchObject({
      installmentCurrent: 1,
      installmentTotal: 3,
    });
  });
});
