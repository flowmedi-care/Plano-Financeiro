export function stripInstallmentFromDescription(description: string): string {
  return description
    .replace(/\s*-\s*parcela\s+\d{1,2}\/\d{1,2}\s*$/i, "")
    .replace(/\s+parcela\s+\d{1,2}\/\d{1,2}\s*$/i, "")
    .replace(/\s+(\d{1,2})\/(\d{1,2})\s*$/, (match, currentRaw, totalRaw) => {
      const current = Number(currentRaw);
      const total = Number(totalRaw);
      if (current >= 1 && current <= total && total <= 48) {
        return "";
      }
      return match;
    })
    .trim();
}

export function extractInstallmentFromTitle(
  title: string
): { current: number; total: number } | null {
  const parcelaMatch = title.match(/parcela\s+(\d+)\/(\d+)/i);
  if (parcelaMatch) {
    return {
      current: Number(parcelaMatch[1]),
      total: Number(parcelaMatch[2]),
    };
  }

  const suffixMatch = title.match(/(\d{1,2})\/(\d{1,2})\s*$/);
  if (suffixMatch) {
    const current = Number(suffixMatch[1]);
    const total = Number(suffixMatch[2]);
    if (current <= total && total <= 48) {
      return { current, total };
    }
  }

  return null;
}

export function extractInstallmentFromItauLine(
  merchantPart: string
): { merchant: string; current: number | null; total: number | null } {
  const embeddedMatch = merchantPart.match(
    /^(.+?)\s+([A-Z]{0,2})(\d{1,2})\/(\d{1,2})$/i
  );

  if (embeddedMatch) {
    const current = Number(embeddedMatch[3]);
    const total = Number(embeddedMatch[4]);
    if (current <= total && total <= 48) {
      return {
        merchant: embeddedMatch[1].trim(),
        current,
        total,
      };
    }
  }

  return {
    merchant: merchantPart.trim(),
    current: null,
    total: null,
  };
}
