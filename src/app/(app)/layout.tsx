import { ArrowLeftRight, LogOut, Menu } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { LocaleSwitch } from "@/components/locale-switch";
import { NavSections, type NavItem, type NavSection } from "@/components/shell/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getI18n } from "@/i18n/server";
import { requireWorkspace } from "@/lib/dal";
import { env } from "@/lib/env";
import { Feat, Perm } from "@/lib/permissions";
import { THEME_COOKIE } from "@/lib/theme";
import { logout } from "../actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [ws, { dict, t }] = await Promise.all([requireWorkspace(), getI18n()]);
  const theme = (await cookies()).get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  const allowed = (feature: string, permission: string) => ws.has(feature) && ws.can(permission);
  const items = (...list: Array<NavItem | false>) => list.filter((item): item is NavItem => item !== false);

  const sections = [
    { items: items({ href: "/", label: dict.nav.dashboard, icon: "dashboard" }) },
    {
      label: dict.nav.accounting,
      items: items(
        allowed(Feat.CHART_OF_ACCOUNTS, Perm.ACCOUNTS_READ) && { href: "/accounts", label: dict.nav.chartOfAccounts, icon: "accounts" },
        allowed(Feat.JOURNALS, Perm.JOURNALS_READ) && { href: "/journals", label: dict.nav.journals, icon: "journals" },
      ),
    },
    {
      label: dict.nav.salesPurchases,
      items: items(
        allowed(Feat.CONTACTS, Perm.CONTACTS_READ) && { href: "/contacts", label: dict.nav.contacts, icon: "contacts" },
        allowed(Feat.ITEMS, Perm.ITEMS_READ) && { href: "/items", label: dict.nav.items, icon: "items" },
      ),
    },
    {
      label: dict.nav.reports,
      items: items(
        allowed(Feat.LEDGER_REPORTS, Perm.REPORTS_READ) && { href: "/reports/trial-balance", label: dict.nav.trialBalance, icon: "trialBalance" },
      ),
    },
    {
      label: dict.nav.settings,
      items: items(
        ws.can(Perm.JOURNALS_READ) && { href: "/settings/periods", label: dict.nav.fiscalPeriods, icon: "periods" },
        allowed(Feat.TAX_CODES, Perm.TAXES_READ) && { href: "/settings/taxes", label: dict.nav.taxCodes, icon: "taxes" },
        ws.can(Perm.TENANT_READ) && { href: "/settings/company", label: dict.nav.companyTax, icon: "company" },
      ),
    },
  ].filter((section): section is NavSection => section.items.length > 0);

  const company = ws.company.tradeName ?? ws.company.legalName;
  const initials = ws.user.fullName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <nav aria-label={dict.nav.accounting} className="flex h-full flex-col">
      <Link href="/" className="mb-6 px-3">
        <span className="font-display text-[30px] leading-none tracking-[-0.02em]">{dict.common.appName}</span>
      </Link>
      <div className="mb-6 px-3">
        <p className="truncate text-[13px] font-medium text-ink" title={ws.company.legalName}>
          {company}
        </p>
        <p className="mt-0.5 text-[11.5px] text-muted">
          {ws.plan && t(dict.dashboard.planLabel, { plan: ws.plan.charAt(0).toUpperCase() + ws.plan.slice(1) })} ·{" "}
          <span className="num">{ws.company.baseCurrency}</span>
        </p>
        {ws.tenants.length > 1 && (
          <Link href="/select-company" className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink">
            <ArrowLeftRight className="size-3.5" aria-hidden />
            {dict.nav.switchCompany}
          </Link>
        )}
      </div>
      <NavSections sections={sections} />
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {env.environment !== "production" && (
        <p className="bg-accent px-4 py-1 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-accent-ink lg:col-span-2">
          {t(dict.common.nonProduction, { env: env.environment })}
        </p>
      )}
      {/* Border/background on the full-height column; the nav itself stays pinned. */}
      <div className="hidden border-e border-line bg-surface/60 lg:block">
        <aside className="sticky top-0 h-dvh overflow-y-auto px-3 py-6">{sidebar}</aside>
      </div>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-8">
          {/* Mobile navigation: native <details>, works without JavaScript. */}
          <details className="relative lg:hidden">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md hover:bg-surface-2">
              <Menu className="size-4" aria-hidden />
              <span className="sr-only">{dict.nav.openMenu}</span>
            </summary>
            <div className="absolute start-0 top-11 w-64 rounded-lg border border-line bg-surface p-3 shadow-card">{sidebar}</div>
          </details>
          <Link href="/" className="font-display text-2xl lg:hidden">
            {dict.common.appName}
          </Link>

          <span className="ms-auto" />
          <LocaleSwitch />
          <ThemeToggle initial={theme} />
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-md py-1 pe-2 ps-1 hover:bg-surface-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent font-mono text-[11px] font-medium text-accent-ink">
                {initials}
              </span>
              <span className="hidden text-start leading-tight sm:block">
                <span className="block text-[13px] font-medium">{ws.user.fullName}</span>
                <span className="block text-[11.5px] text-muted">{ws.company.role.name}</span>
              </span>
            </summary>
            <div className="absolute end-0 top-12 w-60 rounded-lg border border-line bg-surface p-1.5 shadow-card">
              <p className="truncate px-3 py-2 text-[12px] text-muted" dir="ltr">
                {ws.user.email}
              </p>
              {ws.tenants.length > 1 && (
                <Link
                  href="/select-company"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  <ArrowLeftRight className="size-4" aria-hidden />
                  {dict.nav.switchCompany}
                </Link>
              )}
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
                  {dict.common.signOut}
                </button>
              </form>
            </div>
          </details>
        </header>

        <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
