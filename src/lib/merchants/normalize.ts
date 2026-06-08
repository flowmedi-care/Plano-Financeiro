export function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .trim()
    .replace(/-ct\b/gi, "")
    .replace(/\.com\/bill\.?/gi, "combill")
    .replace(/[^a-z0-9*]/g, "")
    .replace(/\*+/g, "*");
}

export function buildDedupHash(params: {
  accountId: string;
  date: string;
  amountCents: number;
  merchantKey: string;
  installmentCurrent: number | null;
}): string {
  const installment = params.installmentCurrent ?? 0;
  return [
    params.accountId,
    params.date,
    params.amountCents,
    params.merchantKey,
    installment,
  ].join("|");
}
