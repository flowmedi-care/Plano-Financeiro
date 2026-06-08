import { parseBrazilianAmount } from "@/lib/parsers/amount";
import { extractInstallmentFromItauLine } from "@/lib/parsers/installments";
import { normalizeMerchant } from "@/lib/merchants/normalize";
import type {
  ParseResult,
  ParsedInstallmentProjection,
  ParsedTransaction,
} from "@/types/database";

const TRANSACTION_LINE_SPACED =
  /^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)$/;
const TRANSACTION_LINE_COMPACT =
  /^(\d{2}\/\d{2})(.+?)(?:(\d{1,2})\/(\d{1,2}))?(\d+,\d{2})$/;

const NOISE_PATTERNS = [
  /^banco itaú/i,
  /^local de pagamento/i,
  /^nome do beneficiário/i,
  /^data do documento/i,
  /^instruções de responsabilidade/i,
  /^continua/i,
  /^lançamentos:/i,
  /^data estabelecimento/i,
  /^limite /i,
  /^valor /i,
  /^total /i,
  /^juros/i,
  /^encargos/i,
  /^processo susep/i,
  /^pc -/i,
  /^-- \d+ of \d+ --/i,
  /^[A-Z]{2,}\s+\./,
  /^\d{4}\s+\d{4}$/,
  /^r\$\s/i,
  /^%/,
  /^\+/,
  /^=/,
  /^-$/,
  /^recibo do pagador/i,
  /^sacador avalista/i,
  /^autenticação mecânica/i,
  /^previsão/i,
  /^emissão:/i,
  /^postagem:/i,
  /^vencimento:/i,
  /^titular$/i,
  /^cartão$/i,
  /^platinum$/i,
  /^novidade:/i,
  /^importante:/i,
  /^consulte/i,
  /^oferta válida/i,
  /^o parcelamento/i,
  /^pague sua fatura/i,
  /^indique o valor/i,
  /^nome do pagador/i,
  /^diversos \./i,
  /^vestuário \./i,
  /^alimentação \./i,
  /^saúde \./i,
  /^educação \./i,
  /^veículos \./i,
  /^hobby \./i,
  /^turismo/i,
];

function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 8) return true;
  return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function toIsoDate(dayMonth: string, referenceYear: number): string {
  const [day, month] = dayMonth.split("/").map(Number);
  const year = referenceYear;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseTransactionLine(
  line: string,
  referenceYear: number,
  cardLastDigits?: string
): ParsedTransaction | null {
  const trimmed = line.trim();
  const spacedMatch = trimmed.match(TRANSACTION_LINE_SPACED);
  const compactMatch = trimmed.match(TRANSACTION_LINE_COMPACT);

  if (!spacedMatch && !compactMatch) return null;

  let dayMonth: string;
  let merchantRaw: string;
  let amountRaw: string;
  let installmentCurrent: number | null = null;
  let installmentTotal: number | null = null;

  if (spacedMatch) {
    [, dayMonth, merchantRaw, amountRaw] = spacedMatch;
  } else if (compactMatch) {
    installmentCurrent = compactMatch[3] ? Number(compactMatch[3]) : null;
    installmentTotal = compactMatch[4] ? Number(compactMatch[4]) : null;
    dayMonth = compactMatch[1];
    merchantRaw = compactMatch[2];
    amountRaw = compactMatch[5];
  } else {
    return null;
  }

  const installmentFromMerchant = extractInstallmentFromItauLine(merchantRaw);
  const merchant = installmentFromMerchant.merchant;
  const current = installmentCurrent ?? installmentFromMerchant.current;
  const total = installmentTotal ?? installmentFromMerchant.total;

  let amountCents: number;
  try {
    amountCents = parseBrazilianAmount(amountRaw);
  } catch {
    return null;
  }

  const description = merchant.trim();
  const lower = description.toLowerCase();
  const isPayment =
    lower.includes("pagamento") || lower.includes("pagto") || amountCents < 0;

  return {
    date: toIsoDate(dayMonth, referenceYear),
    description,
    merchantKey: normalizeMerchant(description),
    amountCents: Math.abs(amountCents),
    installmentCurrent: current,
    installmentTotal: total,
    isPayment,
    isIof: lower.includes("iof"),
    cardLastDigits,
  };
}

function extractReferenceYear(text: string): number {
  const emissaoMatch = text.match(/Emissão:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (emissaoMatch) return Number(emissaoMatch[3]);

  const vencimentoMatch = text.match(/Vencimento:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (vencimentoMatch) return Number(vencimentoMatch[3]);

  return new Date().getFullYear();
}

function extractReferenceMonth(text: string): string | undefined {
  const emissaoMatch = text.match(/Emissão:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (emissaoMatch) {
    return `${emissaoMatch[3]}-${emissaoMatch[2]}`;
  }
  return undefined;
}

function extractFutureInstallments(
  lines: string[],
  referenceYear: number
): ParsedInstallmentProjection[] {
  const projections: ParsedInstallmentProjection[] = [];
  let inFutureSection = false;

  for (const line of lines) {
    if (/compras parceladas\s*-\s*próximas faturas/i.test(line)) {
      inFutureSection = true;
      continue;
    }

    if (inFutureSection && /limites de crédito/i.test(line)) {
      break;
    }

    if (!inFutureSection) continue;

    const parsed = parseTransactionLine(line, referenceYear);
    if (!parsed) continue;

    const {
      date,
      description: merchant,
      installmentCurrent: current,
      installmentTotal: total,
      amountCents,
    } = parsed;
    if (!current || !total || current >= total) continue;

    projections.push({
      date,
      description: merchant,
      merchantKey: normalizeMerchant(merchant),
      installmentCurrent: current,
      installmentTotal: total,
      amountCents,
    });
  }

  return projections;
}

export function parseItauPdfText(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const referenceYear = extractReferenceYear(text);
  const referenceMonth = extractReferenceMonth(text);

  const transactions: ParsedTransaction[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (isNoiseLine(line)) continue;

    const parsed = parseTransactionLine(line, referenceYear);
    if (!parsed) continue;

    const key = `${parsed.date}|${parsed.merchantKey}|${parsed.amountCents}|${parsed.installmentCurrent ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);

    transactions.push(parsed);
  }

  const installmentProjections = extractFutureInstallments(lines, referenceYear);

  if (transactions.length === 0) {
    warnings.push("Nenhuma transação encontrada no PDF. Verifique o arquivo.");
  }

  return {
    transactions,
    installmentProjections,
    referenceMonth,
    warnings,
  };
}

export async function parseItauPdf(buffer: Buffer): Promise<ParseResult> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return parseItauPdfText(data.text);
}
