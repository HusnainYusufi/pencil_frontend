import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { ar } from "./dictionaries/ar";
import { en, type Dictionary } from "./dictionaries/en";
import { interpolate } from "./format";

const DICTIONARIES: Record<Locale, Dictionary> = { ar, en };

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Dictionary + interpolation helper for Server Components and actions. */
export async function getI18n() {
  const locale = await getLocale();
  const dict = DICTIONARIES[locale];
  return { locale, dict, t: (template: string, vars?: Record<string, string | number>) => interpolate(template, vars) };
}

export const dictionaryFor = (locale: Locale): Dictionary => DICTIONARIES[locale];
