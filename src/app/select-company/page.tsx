import { Building2, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { safeNext } from "@/lib/actions";
import { getMe } from "@/lib/dal";
import { THEME_COOKIE } from "@/lib/theme";
import { logout, selectCompany } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.company.selectTitle };
}

export default async function SelectCompanyPage({ searchParams }: PageProps<"/select-company">) {
  const [{ dict, locale }, me, params] = await Promise.all([getI18n(), getMe(), searchParams]);
  const theme = (await cookies()).get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  const next = safeNext(typeof params.next === "string" ? params.next : "/");
  const Chevron = locale === "ar" ? ChevronLeft : ChevronRight;

  return (
    <main className="ruled flex min-h-dvh flex-col px-5 py-6">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-3xl">
          <span className="mark">{dict.common.appName}</span>
        </p>
        <div className="flex items-center gap-1">
          <LocaleSwitch />
          <ThemeToggle initial={theme} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[520px] flex-1 py-12">
        <h1 className="font-display text-[36px] leading-tight">{dict.company.selectTitle}</h1>
        <p className="mt-1 text-ink-2">{dict.company.selectSubtitle}</p>

        {me.tenants.length === 0 ? (
          <p className="mt-8 rounded-lg border border-line bg-surface p-6 text-ink-2">{dict.company.noCompanies}</p>
        ) : (
          <ul className="mt-8 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            {me.tenants.map((company) => {
              const current = me.activeTenant?.id === company.id;
              const suspended = company.status !== "ACTIVE";
              return (
                <li key={company.id} className="border-b border-line last:border-b-0">
                  <form action={selectCompany}>
                    <input type="hidden" name="tenantId" value={company.id} />
                    <input type="hidden" name="next" value={next} />
                    <button
                      type="submit"
                      disabled={suspended}
                      className="group flex w-full items-center gap-4 px-5 py-4 text-start transition-colors duration-150 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2 group-hover:bg-accent group-hover:text-accent-ink">
                        <Building2 className="size-4.5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{company.tradeName ?? company.legalName}</span>
                        <span className="mt-0.5 block text-[12.5px] text-muted">
                          {company.country === "SA" ? dict.auth.saudiArabia : dict.auth.jordan} · <span className="num">{company.baseCurrency}</span> ·{" "}
                          {company.role.name}
                        </span>
                      </span>
                      {current && <Badge tone="accent">{dict.company.current}</Badge>}
                      {suspended && <Badge tone="danger">{dict.company.suspended}</Badge>}
                      <Chevron className="size-4 shrink-0 text-muted group-hover:text-ink" aria-hidden />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <form action={logout} className="mt-6">
          <button type="submit" className="inline-flex items-center gap-2 text-[13px] text-ink-2 hover:text-ink">
            <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
            {dict.common.signOut}
          </button>
        </form>
      </div>
    </main>
  );
}
