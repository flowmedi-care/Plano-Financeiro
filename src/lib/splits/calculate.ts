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

/** Divide entre você + outras pessoas; retorna splits só para os outros. */
export function splitEquallyAmongOthers(
  totalCents: number,
  otherPersonIds: string[]
): SplitInput[] {
  if (otherPersonIds.length === 0) return [];

  const participants = otherPersonIds.length + 1;
  const base = Math.floor(totalCents / participants);
  const remainder = totalCents % participants;

  return otherPersonIds.map((personId, index) => ({
    personId,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}

export function selfShareCents(totalCents: number, splits: SplitInput[]): number {
  const others = splits.reduce((sum, s) => sum + s.amountCents, 0);
  return totalCents - others;
}

export function splitsFromRule(
  amountCents: number,
  mode: "full" | "equal",
  personIds: string[]
): SplitInput[] {
  if (personIds.length === 0) return [];
  if (mode === "full") return splitFull(personIds[0], amountCents);
  return splitEquallyAmongOthers(amountCents, personIds);
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
