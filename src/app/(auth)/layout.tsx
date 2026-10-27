import { ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { getI18n } from "@/i18n/server";
import { THEME_COOKIE } from "@/lib/theme";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const { dict } = await getI18n();
  const theme = (await cookies()).get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";

  return (
    <main className="ruled grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Ledger side: the brand moment, deliberately quiet. */}
      <section className="relative hidden flex-col justify-between px-20 py-14 lg:flex">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{dict.auth.tagline}</p>
        <div>
          <p className="font-display text-[clamp(5rem,9vw,8.5rem)] leading-[0.9] tracking-[-0.03em] text-ink">
            <span className="mark">{dict.common.appName}</span>
          </p>
          <p className="mt-8 max-w-md font-display text-[28px] italic leading-snug text-ink-2">{dict.auth.taglineSub}</p>
        </div>
        <ul className="flex gap-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <li>
            {dict.auth.saudiArabia} · <span lang="en">ZATCA</span>
          </li>
          <li>
            {dict.auth.jordan} · <span lang="en">JoFotara</span>
          </li>
        </ul>
      </section>

      <section className="flex flex-col px-5 py-6 lg:border-s lg:border-line lg:bg-bg/80">
        <div className="flex items-center justify-end gap-1">
          <LocaleSwitch />
          <ThemeToggle initial={theme} />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[420px]">
            <p className="mb-2 font-display text-5xl lg:hidden">
              <span className="mark">{dict.common.appName}</span>
            </p>
            {children}
            <p className="mt-6 flex items-center justify-center gap-2 text-center text-[12.5px] text-muted">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
              {dict.auth.securityNote}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
