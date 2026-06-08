export function parseBrazilianAmount(value: string): number {
  const cleaned = value.trim().replace(/\s/g, "").replace(/"/g, "");

  let normalized: string;

  if (cleaned.includes(",")) {
    normalized = cleaned
      .replace(/^-/, "NEG")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace("NEG", "-");
  } else if (/^-?\d+\.\d{1,2}$/.test(cleaned)) {
    normalized = cleaned;
  } else {
    normalized = cleaned.replace(/^-/, "NEG").replace(/\./g, "").replace("NEG", "-");
  }

  const amount = Number.parseFloat(normalized);
  if (Number.isNaN(amount)) {
    throw new Error(`Valor inválido: ${value}`);
  }

  return Math.round(amount * 100);
}
