import { stripInstallmentFromDescription } from "@/lib/parsers/installments";

export function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .trim()
    .replace(/-ct\b/gi, "")
    .replace(/\.com\/bill\.?/gi, "combill")
    .replace(/[^a-z0-9*]/g, "")
    .replace(/\*+/g, "*");
}

/** Merchant key for rules/matching — ignores installment number in description. */
export function merchantKeyFromDescription(description: string): string {
  return normalizeMerchant(stripInstallmentFromDescription(description));
}

/** Normalize legacy merchant keys that still embed parcela info. */
export function stableMerchantKeyFromNormalized(merchantKey: string): string {
  return merchantKey.replace(/parcela\d{1,2}\d{1,2}$/i, "");
}

export function merchantKeysForRuleLookup(params: {
  merchantKey: string;
  description?: string;
}): string[] {
  const keys = new Set<string>();

  if (params.description) {
    keys.add(merchantKeyFromDescription(params.description));
  }

  keys.add(stableMerchantKeyFromNormalized(params.merchantKey));
  keys.add(params.merchantKey);

  return Array.from(keys);
}

export function lookupInRuleMap<T>(
  map: Map<string, T>,
  merchantKey: string,
  accountId: string,
  description?: string
): T | undefined {
  const candidateKeys = merchantKeysForRuleLookup({ merchantKey, description });
  const stableCandidates = new Set(
    candidateKeys.map((key) => stableMerchantKeyFromNormalized(key))
  );

  for (const key of candidateKeys) {
    const withAccount = map.get(`${key}|${accountId}`);
    if (withAccount !== undefined) return withAccount;
    const global = map.get(key);
    if (global !== undefined) return global;
  }

  for (const [mapKey, value] of map) {
    const accountSuffix = `|${accountId}`;
    const merchantPart = mapKey.endsWith(accountSuffix)
      ? mapKey.slice(0, -accountSuffix.length)
      : mapKey;

    if (mapKey.includes("|") && !mapKey.endsWith(accountSuffix)) {
      continue;
    }

    if (stableCandidates.has(stableMerchantKeyFromNormalized(merchantPart))) {
      return value;
    }
  }

  return undefined;
}

export function buildDedupHash(params: {
  accountId: string;
  cardId?: string | null;
  date: string;
  amountCents: number;
  merchantKey: string;
  installmentCurrent: number | null;
}): string {
  const installment = params.installmentCurrent ?? 0;
  return [
    params.accountId,
    params.cardId ?? "none",
    params.date,
    params.amountCents,
    params.merchantKey,
    installment,
  ].join("|");
}
