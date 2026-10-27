import { intlLocale, type Locale } from "./config";

/** "{name}" placeholders → values. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in vars ? String(vars[key]) : `{${key}}`));
}

const MINOR_UNITS: Record<string, number> = { SAR: 2, JOD: 3, USD: 2, AED: 2, KWD: 3, BHD: 3, OMR: 3 };
export const minorUnits = (currency: string) => MINOR_UNITS[currency] ?? 2;

/**
 * Money arrives from the API as decimal strings and stays a string: we only
 * group thousands and pad to the currency's scale. Never parsed into floats.
 */
export function formatAmount(amount: string, currency: string): string {
  const negative = amount.startsWith("-");
  const [whole = "0", fraction = ""] = (negative ? amount.slice(1) : amount).split(".");
  const scale = minorUnits(currency);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = scale > 0 ? `${grouped}.${fraction.padEnd(scale, "0").slice(0, scale)}` : grouped;
  return negative ? `-${body}` : body;
}

export const isZeroAmount = (amount: string) => !/[1-9]/.test(amount);

export function formatDate(iso: string | null | undefined, locale: Locale, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!iso) return "—";
  const date = iso.length === 10 ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat(intlLocale(locale), { ...opts, timeZone: "UTC" }).format(date);
}
