export const DISTRIBUTEURS = ["TIMECOM", "STI", "LOTUS NET", "STARTECK"] as const;
export type Distributeur = (typeof DISTRIBUTEURS)[number];

export function normalizeMsisdn(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidMsisdn(input: string): boolean {
  const n = normalizeMsisdn(input);
  // Algerian mobile: 10 digits starting with 0, or 12 digits starting with 213
  return /^0[5-7]\d{8}$/.test(n) || /^213[5-7]\d{8}$/.test(n);
}
