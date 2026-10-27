"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

/** Flips data-theme on <html> and remembers the choice for server rendering. */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const { dict } = useI18n();
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
        setTheme(next);
      }}
      aria-label={dict.common.switchTheme}
      title={dict.common.switchTheme}
      className="inline-flex size-9 items-center justify-center rounded-md text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
    >
      {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
