import type { Locale } from "@/i18n/config";

/** Arabic name when the UI is Arabic and one exists; the (English/legal) name otherwise. */
export function localName(item: { name: string; nameAr?: string | null }, locale: Locale): string {
  return locale === "ar" && item.nameAr ? item.nameAr : item.name;
}

/** Countries offered first in contact forms: GCC, the region and main trading partners. */
const COUNTRIES = ["SA", "JO", "AE", "KW", "BH", "QA", "OM", "EG", "IQ", "LB", "PS", "YE", "TR", "IN", "PK", "CN", "GB", "US", "DE", "FR", "IT"];

/**
 * Country choices with localised names. Built on the server only: Node and
 * browsers ship different ICU region names, so computing them in a client
 * component would break hydration.
 */
export const countryOptions = (locale: Locale) => {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return COUNTRIES.map((code) => ({ code, label: names.of(code) ?? code }));
};

/** Today's date as YYYY-MM-DD (UTC; the API resolves company time zones). */
export const isoDate = (epochMs: number) => new Date(epochMs).toISOString().slice(0, 10);

/** Static padding classes by tree depth (no inline styles under the CSP). */
const INDENT = ["ps-4", "ps-9", "ps-14", "ps-[4.75rem]", "ps-24", "ps-[7.25rem]"] as const;
export const indentClass = (depth: number) => INDENT[Math.min(depth, INDENT.length - 1)];
