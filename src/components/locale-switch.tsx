"use client";

import { Languages } from "lucide-react";
import { setLocale } from "@/app/actions";
import { useI18n } from "@/i18n/client";

/** One-click language flip. A plain form: works before hydration too. */
export function LocaleSwitch() {
  const { locale, dict } = useI18n();
  const target = locale === "ar" ? "en" : "ar";
  return (
    <form action={setLocale}>
      <input type="hidden" name="locale" value={target} />
      <button
        type="submit"
        lang={target}
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        <Languages className="size-4" aria-hidden />
        {dict.common.language}
      </button>
    </form>
  );
}
