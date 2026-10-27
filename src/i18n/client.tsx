"use client";

import { createContext, useContext, type ReactNode } from "react";
import { directionOf, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";
import { interpolate } from "./format";

interface I18nValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  dict: Dictionary;
  t: (template: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Server-selected dictionary handed to Client Components (no client fetch). */
export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  return (
    <I18nContext value={{ locale, dict, dir: directionOf(locale), t: interpolate }}>{children}</I18nContext>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
