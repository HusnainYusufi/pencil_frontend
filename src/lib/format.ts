import type { Locale } from "@/i18n/config";

/** Arabic name when the UI is Arabic and one exists; the (English/legal) name otherwise. */
export function localName(item: { name: string; nameAr?: string | null }, locale: Locale): string {
  return locale === "ar" && item.nameAr ? item.nameAr : item.name;
}

/** Today's date as YYYY-MM-DD (UTC; the API resolves company time zones). */
export const isoDate = (epochMs: number) => new Date(epochMs).toISOString().slice(0, 10);

/** Static padding classes by tree depth (no inline styles under the CSP). */
const INDENT = ["ps-4", "ps-9", "ps-14", "ps-[4.75rem]", "ps-24", "ps-[7.25rem]"] as const;
export const indentClass = (depth: number) => INDENT[Math.min(depth, INDENT.length - 1)];
