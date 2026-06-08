export interface SplitInput {
  personId: string;
  amountCents: number;
}

export function splitEqually(
  totalCents: number,
  personIds: string[]
): SplitInput[] {
  if (personIds.length === 0) return [];

  const base = Math.floor(totalCents / personIds.length);
  const remainder = totalCents % personIds.length;

  return personIds.map((personId, index) => ({
    personId,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}

export function splitFull(personId: string, totalCents: number): SplitInput[] {
  return [{ personId, amountCents: totalCents }];
}

export function validateSplits(
  totalCents: number,
  splits: SplitInput[]
): { valid: boolean; error?: string } {
  if (splits.length === 0) {
    return { valid: true };
  }

  const personIds = splits.map((s) => s.personId);
  if (new Set(personIds).size !== personIds.length) {
    return { valid: false, error: "Pessoa duplicada na divisão" };
  }

  for (const split of splits) {
    if (split.amountCents <= 0) {
      return { valid: false, error: "Valores devem ser maiores que zero" };
    }
  }

  const sum = splits.reduce((acc, s) => acc + s.amountCents, 0);
  if (sum > totalCents) {
    return { valid: false, error: "Soma dos valores excede o total da transação" };
  }

  return { valid: true };
}
