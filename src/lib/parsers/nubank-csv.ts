import Papa from "papaparse";
import { parseBrazilianAmount } from "@/lib/parsers/amount";
import { extractInstallmentFromTitle } from "@/lib/parsers/installments";
import { merchantKeyFromDescription } from "@/lib/merchants/normalize";
import type { ParseResult, ParsedTransaction } from "@/types/database";

interface NubankRow {
  date: string;
  title: string;
  amount: string;
}

function isQuotedFormat(content: string): boolean {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return false;
  return lines[1].trim().startsWith('"');
}

function parseQuotedLine(line: string): NubankRow | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return null;

  const inner = trimmed.slice(1, -1).replace(/""/g, '"');
  const amountMatch = inner.match(/,\s*"?(-?\s*[\d.]+,\d{2})"?\s*$/);
  if (!amountMatch) return null;

  const amount = amountMatch[1].replace(/\s/g, "");
  const beforeAmount = inner.slice(0, inner.lastIndexOf(amountMatch[0]));
  const firstComma = beforeAmount.indexOf(",");
  if (firstComma === -1) return null;

  const date = beforeAmount.slice(0, firstComma).trim();
  const title = beforeAmount.slice(firstComma + 1).replace(/"/g, "").trim();

  return { date, title, amount };
}

function parseQuotedFormat(content: string): NubankRow[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const rows: NubankRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseQuotedLine(lines[i]);
    if (row) rows.push(row);
  }

  return rows;
}

function parseStandardFormat(content: string): NubankRow[] {
  const result = Papa.parse<NubankRow>(content, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.filter((row) => row.date && row.title && row.amount);
}

function mapRow(row: NubankRow): ParsedTransaction | null {
  const description = row.title.trim();
  const lower = description.toLowerCase();

  const isPayment = lower.includes("pagamento recebido");
  const isIof = lower.startsWith("iof de");
  const installment = extractInstallmentFromTitle(description);

  let amountCents: number;
  try {
    amountCents = parseBrazilianAmount(row.amount);
  } catch {
    return null;
  }

  if (isPayment) {
    amountCents = Math.abs(amountCents);
  }

  return {
    date: row.date.trim(),
    description,
    merchantKey: merchantKeyFromDescription(description),
    amountCents: Math.abs(amountCents),
    installmentCurrent: installment?.current ?? null,
    installmentTotal: installment?.total ?? null,
    isPayment,
    isIof,
  };
}

export function parseNubankCsv(content: string): ParseResult {
  const warnings: string[] = [];
  const rows = isQuotedFormat(content)
    ? parseQuotedFormat(content)
    : parseStandardFormat(content);

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const parsed = mapRow(row);
    if (!parsed) {
      warnings.push(`Linha ignorada: ${row.title || "desconhecida"}`);
      continue;
    }
    transactions.push(parsed);
  }

  return {
    transactions,
    installmentProjections: [],
    warnings,
  };
}
