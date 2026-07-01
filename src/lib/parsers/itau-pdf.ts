import { parseBrazilianAmount } from "@/lib/parsers/amount";
import { extractInstallmentFromItauLine } from "@/lib/parsers/installments";
import { merchantKeyFromDescription } from "@/lib/merchants/normalize";
import type {
  DetectedCardSummary,
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
  /^próxima fatura/i,
  /^demais faturas/i,
  /^total para próximas faturas/i,
];

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function isNoiseLine(line: string): boolean {
  const trimmed = normalizeLine(line);
  if (!trimmed || trimmed.length < 8) return true;
  const compact = trimmed.replace(/\s/g, " ").toLowerCase();
  if (/^próximafatura|^demaisfaturas|^totalparapróximasfaturas/i.test(compact.replace(/\s/g, ""))) {
    return true;
  }
  return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function toIsoDate(dayMonth: string, referenceYear: number): string {
  const [day, month] = dayMonth.split("/").map(Number);
  return `${referenceYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
    merchantKey: merchantKeyFromDescription(description),
    amountCents: Math.abs(amountCents),
    installmentCurrent: current,
    installmentTotal: total,
    isPayment,
    isIof: lower.includes("iof"),
    cardLastDigits,
  };
}

function getFutureSectionLineIndices(lines: string[]): Set<number> {
  const indices = new Set<number>();

  for (let i = 0; i < lines.length - 1; i++) {
    const compact = lines[i].replace(/\s/g, "").toLowerCase();
    if (/comprasparceladas.*pr[oó]ximasfaturas/i.test(compact)) {
      for (let j = i + 1; j < lines.length; j++) {
        const nextCompact = lines[j].replace(/\s/g, "").toLowerCase();
        if (/limitesdecr[eé]dito|limitedetotaldecr[eé]dito/i.test(nextCompact)) {
          break;
        }
        if (/^\d{2}\/\d{2}/.test(lines[j])) {
          indices.add(j);
        }
      }
    }

    if (lines[i] === "L" && lines[i + 1] === "E") {
      for (let j = i + 2; j < lines.length; j++) {
        const nextCompact = lines[j].replace(/\s/g, "").toLowerCase();
        if (
          /comprasparceladas|limitesdecr[eé]dito|limitedetotaldecr[eé]dito/i.test(
            nextCompact
          )
        ) {
          break;
        }
        if (/^\d{2}\/\d{2}/.test(lines[j])) {
          indices.add(j);
        }
      }
    }
  }

  return indices;
}

function excludeFutureInstallmentDuplicates(
  transactions: ParsedTransaction[]
): { current: ParsedTransaction[]; projections: ParsedInstallmentProjection[] } {
  const groups = new Map<string, ParsedTransaction[]>();

  for (const tx of transactions) {
    if (tx.isPayment || !tx.installmentCurrent || !tx.installmentTotal) continue;
    const key = `${tx.merchantKey}|${tx.amountCents}|${tx.installmentTotal}`;
    const group = groups.get(key) ?? [];
    group.push(tx);
    groups.set(key, group);
  }

  const excluded = new Set<ParsedTransaction>();
  const projections: ParsedInstallmentProjection[] = [];

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const sorted = [...group].sort(
      (a, b) => (a.installmentCurrent ?? 0) - (b.installmentCurrent ?? 0)
    );
    const [current, ...future] = sorted;

    for (const tx of future) {
      excluded.add(tx);
      projections.push({
        date: tx.date,
        description: tx.description,
        merchantKey: tx.merchantKey,
        installmentCurrent: tx.installmentCurrent!,
        installmentTotal: tx.installmentTotal!,
        amountCents: tx.amountCents,
        cardLastDigits: tx.cardLastDigits,
      });
    }

    void current;
  }

  return {
    current: transactions.filter((tx) => !excluded.has(tx)),
    projections,
  };
}

function extractDetectedCards(lines: string[]): DetectedCardSummary[] {
  const cards: DetectedCardSummary[] = [];

  for (const line of lines) {
    const summaryMatch = line.match(
      /lan[cç]amentos\s*no\s*cart[aã]o\s*\(final\s*(\d{4})\)\s*([\d.,]+)/i
    );
    if (summaryMatch) {
      try {
        cards.push({
          lastDigits: summaryMatch[1],
          totalCents: parseBrazilianAmount(summaryMatch[2]),
        });
      } catch {
        // ignore
      }
      continue;
    }

    const holderMatch = line.match(/\(final\s*(\d{4})\)/i);
    if (holderMatch && cards.length > 0) {
      const last = cards[cards.length - 1];
      if (last.lastDigits === holderMatch[1] && !last.holderName) {
        last.holderName = line.replace(/\(final\s*\d{4}\)/i, "").trim();
      }
    }
  }

  return cards;
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

function extractExpectedTotalCents(lines: string[]): number | null {
  for (const line of lines) {
    const compact = line.replace(/\s/g, "");
    const match = compact.match(/Totaldoslançamentosatuais([\d.,]+)/i);
    if (match) {
      try {
        return parseBrazilianAmount(match[1]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function parseItauPdfText(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const referenceYear = extractReferenceYear(text);
  const referenceMonth = extractReferenceMonth(text);
  const futureLineIndices = getFutureSectionLineIndices(lines);
  const detectedCards = extractDetectedCards(lines);
  const expectedTotalCents = extractExpectedTotalCents(lines);

  const rawTransactions: ParsedTransaction[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;
    if (futureLineIndices.has(i)) continue;

    const parsed = parseTransactionLine(line, referenceYear);
    if (!parsed) continue;

    const key = `${parsed.date}|${parsed.merchantKey}|${parsed.amountCents}|${parsed.installmentCurrent ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rawTransactions.push(parsed);
  }

  const { current: transactions, projections: duplicateProjections } =
    excludeFutureInstallmentDuplicates(rawTransactions);

  const futureSectionProjections: ParsedInstallmentProjection[] = [];
  for (const index of futureLineIndices) {
    const parsed = parseTransactionLine(lines[index], referenceYear);
    if (!parsed || !parsed.installmentCurrent || !parsed.installmentTotal) continue;
    if (parsed.installmentCurrent <= 1) continue;

    futureSectionProjections.push({
      date: parsed.date,
      description: parsed.description,
      merchantKey: parsed.merchantKey,
      installmentCurrent: parsed.installmentCurrent,
      installmentTotal: parsed.installmentTotal,
      amountCents: parsed.amountCents,
      cardLastDigits: parsed.cardLastDigits,
    });
  }

  const installmentProjections = [
    ...duplicateProjections,
    ...futureSectionProjections,
  ];

  const actualTotal = transactions
    .filter((tx) => !tx.isPayment)
    .reduce((sum, tx) => sum + tx.amountCents, 0);

  if (expectedTotalCents !== null && actualTotal !== expectedTotalCents) {
    warnings.push(
      `Total calculado (${(actualTotal / 100).toFixed(2)}) difere do total da fatura (${(expectedTotalCents / 100).toFixed(2)}). Revise os lançamentos.`
    );
  }

  if (installmentProjections.length > 0) {
    warnings.push(
      `${installmentProjections.length} parcela(s) futura(s) foram excluídas desta fatura e salvas apenas como projeção.`
    );
  }

  if (transactions.length === 0) {
    warnings.push("Nenhuma transação encontrada no PDF. Verifique o arquivo.");
  }

  return {
    transactions,
    installmentProjections,
    detectedCards,
    referenceMonth,
    warnings,
  };
}

export async function parseItauPdf(buffer: Buffer): Promise<ParseResult> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return parseItauPdfText(data.text);
}
