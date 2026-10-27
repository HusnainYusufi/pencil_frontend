/**
 * Exact decimal arithmetic for amounts the UI has to add up (journal totals,
 * dashboard figures). Amounts are scaled to integers (BigInt) at the
 * currency's minor-unit scale; floats never touch money.
 */
import { minorUnits } from "@/i18n/format";

const AMOUNT = /^-?\d+(\.\d+)?$/;

export const isAmount = (value: string) => AMOUNT.test(value.trim());

/** "1,234.5" / " 1234.50 " → 123450n at scale 2. Returns null when not a number or too precise. */
export function toMinor(value: string, scale: number): bigint | null {
  const clean = value.replace(/,/g, "").trim();
  if (!clean) return 0n;
  if (!AMOUNT.test(clean)) return null;
  const negative = clean.startsWith("-");
  const [whole = "0", fraction = ""] = (negative ? clean.slice(1) : clean).split(".");
  if (fraction.length > scale) return null;
  const minor = BigInt(whole + fraction.padEnd(scale, "0"));
  return negative ? -minor : minor;
}

/** 123450n at scale 2 → "1234.50" (API format: no grouping). */
export function fromMinor(minor: bigint, scale: number): string {
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(scale + 1, "0");
  const body = scale > 0 ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits;
  return negative ? `-${body}` : body;
}

export function sumAmounts(values: readonly string[], currency: string): string {
  const scale = minorUnits(currency);
  return fromMinor(values.reduce((total, v) => total + (toMinor(v, scale) ?? 0n), 0n), scale);
}

/** debit − credit as a signed decimal string. */
export function net({ debit, credit }: { debit: string; credit: string }, currency: string): string {
  const scale = minorUnits(currency);
  return fromMinor((toMinor(debit, scale) ?? 0n) - (toMinor(credit, scale) ?? 0n), scale);
}

export const negate = (amount: string) => (amount.startsWith("-") ? amount.slice(1) : /[1-9]/.test(amount) ? `-${amount}` : amount);

/** For chart geometry only (never for stored or displayed money). */
export const toChartNumber = (amount: string) => Number(amount);
