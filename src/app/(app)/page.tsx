import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { StatTile } from "@/components/charts/figures";
import { JournalSourceLabel, JournalStatusBadge } from "@/components/journal-badges";
import { Badge, ButtonLink, Card, EmptyState, Table, Td, Th } from "@/components/ui/primitives";
import { intlLocale } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireWorkspace, userApi } from "@/lib/dal";
import { isoDate } from "@/lib/format";
import { fromMinor, toMinor } from "@/lib/money";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { Account, FiscalYear, JournalSummary, Page, TrialBalance } from "@/lib/types";
import { minorUnits } from "@/i18n/format";
import { RevenueChart } from "./revenue-chart";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.nav.dashboard };
}

const CASH_SUBTYPES = new Set(["CASH", "BANK"]);

export default async function DashboardPage() {
  const [ws, { dict, t, locale }] = await Promise.all([requireWorkspace(), getI18n()]);
  const currency = ws.company.baseCurrency;
  const scale = minorUnits(currency);
  const today = isoDate(requestNow());

  const canReports = ws.has(Feat.LEDGER_REPORTS) && ws.can(Perm.REPORTS_READ);
  const canJournals = ws.has(Feat.JOURNALS) && ws.can(Perm.JOURNALS_READ);
  const canPost = ws.has(Feat.JOURNALS) && ws.can(Perm.JOURNALS_POST);
  const canAccounts = ws.has(Feat.CHART_OF_ACCOUNTS) && ws.can(Perm.ACCOUNTS_READ);

  const years = ws.can(Perm.JOURNALS_READ) ? await userApi<FiscalYear[]>("/fiscal-years") : [];
  const year = years.find((y) => y.startDate <= today && today <= y.endDate);
  const period = year?.periods.find((p) => p.startDate <= today && today <= p.endDate);
  const elapsed = year?.periods.filter((p) => p.startDate <= today) ?? [];

  /** Revenue and expense movement from the top-level rows (the API rolls children up). */
  const movementOf = (tb: TrialBalance, type: "REVENUE" | "EXPENSE") =>
    tb.rows
      .filter((r) => r.type === type && r.parentId === null)
      .reduce((sum, r) => {
        const debit = toMinor(r.movement.debit, scale) ?? 0n;
        const credit = toMinor(r.movement.credit, scale) ?? 0n;
        return sum + (type === "REVENUE" ? credit - debit : debit - credit);
      }, 0n);

  const [ytd, months, accounts, recent] = await Promise.all([
    canReports && year ? userApi<TrialBalance>("/reports/trial-balance", { query: { from: year.startDate, to: today } }) : null,
    canReports
      ? Promise.all(
          elapsed.map((p) =>
            userApi<TrialBalance>("/reports/trial-balance", {
              query: { from: p.startDate, to: p.endDate < today ? p.endDate : today },
            }),
          ),
        )
      : [],
    canAccounts && canReports ? userApi<Account[]>("/accounts", { query: { postableOnly: true } }) : [],
    canJournals ? userApi<Page<JournalSummary>>("/journal-entries", { query: { pageSize: 6 } }) : null,
  ]);

  const revenue = ytd ? movementOf(ytd, "REVENUE") : 0n;
  const expenses = ytd ? movementOf(ytd, "EXPENSE") : 0n;
  const cashIds = new Set(accounts.filter((a) => CASH_SUBTYPES.has(a.subtype)).map((a) => a.id));
  const cash = (ytd?.rows ?? [])
    .filter((r) => cashIds.has(r.accountId))
    .reduce((sum, r) => sum + (toMinor(r.closing.debit, scale) ?? 0n) - (toMinor(r.closing.credit, scale) ?? 0n), 0n);

  const monthName = new Intl.DateTimeFormat(intlLocale(locale), { month: "short", timeZone: "UTC" });
  const monthLong = new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" });
  const chartData = elapsed.map((p, i) => {
    const start = new Date(`${p.startDate}T00:00:00Z`);
    return {
      key: p.id,
      tick: monthName.format(start),
      label: monthLong.format(start),
      value: Number(fromMinor(months[i] ? movementOf(months[i], "REVENUE") : 0n, scale)),
    };
  });
  const hasRevenue = chartData.some((d) => d.value !== 0);

  const firstName = ws.user.fullName.split(/\s+/)[0] ?? ws.user.fullName;
  const figure = (minor: bigint) => <Amount value={fromMinor(minor, scale)} currency={currency} showCurrency />;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {year ? t(dict.dashboard.fiscalYear, { name: year.name }) : ws.company.legalName}
          </p>
          <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.01em]">
            <span className="mark">{t(dict.dashboard.greeting, { name: firstName })}</span>
          </h1>
        </div>
        {canPost && (
          <ButtonLink href="/journals/new">
            <Plus className="size-4" aria-hidden />
            {dict.dashboard.newJournal}
          </ButtonLink>
        )}
      </header>

      {canReports && (
        <section className="grid gap-px overflow-hidden rounded-lg border border-line bg-line shadow-card sm:grid-cols-2 xl:grid-cols-4 [&>*]:bg-surface">
          <StatTile label={dict.dashboard.cash} value={figure(cash)} footnote={t(dict.dashboard.asOf, { date: formatDate(today, locale) })} />
          <StatTile label={dict.dashboard.revenue} value={figure(revenue)} footnote={dict.dashboard.yearToDate} />
          <StatTile label={dict.dashboard.expenses} value={figure(expenses)} footnote={dict.dashboard.yearToDate} />
          <StatTile label={dict.dashboard.netIncome} value={figure(revenue - expenses)} footnote={dict.dashboard.yearToDate} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {canReports && year && (
          <Card
            title={dict.dashboard.monthlyRevenue}
            description={t(dict.dashboard.monthlyRevenueDesc, { year: year.name, currency })}
          >
            {hasRevenue ? (
              <RevenueChart data={chartData} currency={currency} />
            ) : (
              <p className="py-16 text-center text-[13px] text-muted">{dict.dashboard.noRevenue}</p>
            )}
          </Card>
        )}

        {period && (
          <Card title={dict.dashboard.openPeriod}>
            <p className="font-display text-[28px] leading-tight">{monthLong.format(new Date(`${period.startDate}T00:00:00Z`))}</p>
            <p className="mt-1 text-[13px] text-muted">
              <span className="num">{period.startDate}</span> → <span className="num">{period.endDate}</span>
            </p>
            <div className="mt-4">
              <Badge tone={period.status === "OPEN" ? "success" : "neutral"}>
                {period.status === "OPEN" ? dict.dashboard.open : dict.dashboard.closed}
              </Badge>
            </div>
          </Card>
        )}
      </div>

      {recent && (
        <Card
          title={dict.dashboard.recentJournals}
          flush
          actions={
            recent.items.length > 0 && (
              <Link href="/journals" className="text-[13px] text-ink-2 hover:text-ink">
                {dict.common.viewAll}
              </Link>
            )
          }
        >
          {recent.items.length === 0 ? (
            <EmptyState
              title={dict.dashboard.noJournals}
              action={
                canPost && (
                  <ButtonLink href="/journals/new" variant="secondary">
                    {dict.dashboard.newJournal}
                  </ButtonLink>
                )
              }
            >
              {dict.dashboard.noJournalsBody}
            </EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{dict.journals.number}</Th>
                  <Th>{dict.common.date}</Th>
                  <Th>{dict.journals.memo}</Th>
                  <Th>{dict.journals.source}</Th>
                  <Th>{dict.common.status}</Th>
                  <Th align="right">{dict.journals.amount}</Th>
                </tr>
              </thead>
              <tbody>
                {recent.items.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-2/50">
                    <Td>
                      <Link href={`/journals/${entry.id}`} className="font-mono text-[12.5px] text-ink hover:underline">
                        <span className="num">{entry.number ?? "—"}</span>
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDate(entry.date, locale)}</Td>
                    <Td className="max-w-[18rem] truncate">{entry.memo ?? entry.reference ?? "—"}</Td>
                    <Td>
                      <JournalSourceLabel source={entry.source} />
                    </Td>
                    <Td>
                      <JournalStatusBadge status={entry.status} />
                    </Td>
                    <Td align="right">
                      <Amount value={entry.totalAmount} currency={entry.currency} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
