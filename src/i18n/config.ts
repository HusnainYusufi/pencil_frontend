export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Arabic first: KSA and Jordan SMEs mostly work in Arabic. */
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "pencil_locale";

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);
export const directionOf = (locale: Locale): "rtl" | "ltr" => (locale === "ar" ? "rtl" : "ltr");

/** BCP-47 tag for Intl formatting. Latin digits in both: clearer for accounting. */
export const intlLocale = (locale: Locale) => (locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB");
