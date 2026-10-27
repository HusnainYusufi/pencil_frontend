import { Lock, LockOpen, Plus, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/interactive";
import { Badge, Card, cn, PageHeader } from "@/components/ui/primitives";
import { intlLocale } from "@/i18n/config";
import { formatAmount, formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { isoDate } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { BooksOverview, FiscalYear, YearEndPreview } from "@/lib/types";
import { openNextYear } from "./actions";
import { BooksForm, ClosePeriodButton, CloseYearDialog, ReopenPeriodDialog, ReopenYearDialog, YearResult } from "./period-controls";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.periods.title };
}

export default async function PeriodsPage() {
  const ws = await requireAccess({ permission: Perm.JOURNALS_READ });
  const { dict, t, locale } = await getI18n();
  const [years, books] = await Promise.all([userApi<FiscalYear[]>("/fiscal-years"), userApi<BooksOverview>("/books")]);
  const previews = new Map(
    (await Promise.all(years.map((y) => userApi<YearEndPreview>(`/fiscal-years/${y.id}/close-preview`)))).map((p) => [p.yearId, p]),
  );

  const managesPeriods = ws.has(Feat.FISCAL_PERIODS) && ws.can(Perm.PERIODS_MANAGE);
  const closesBooks = ws.has(Feat.FISCAL_PERIODS) && ws.can(Perm.BOOKS_CLOSE);
  const today = isoDate(requestNow());
  const month = new Intl.DateTimeFormat(intlLocale(locale), { month: "long", timeZone: "UTC" });
  const lockedThrough = [books.lockDate, books.taxLockDate].filter((d): d is string => d !== null).sort().at(-1);
  const obe = books.openingBalanceEquity;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.settings}
        title={dict.periods.title}
        description={dict.periods.subtitle}
        actions={
          managesPeriods && (
            <form action={openNextYear}>
              <SubmitButton variant="secondary">
                <Plus className="size-4" aria-hidden />
                {dict.periods.newYear}
              </SubmitButton>
            </form>
          )
        }
      />

      <Card title={dict.periods.books} description={dict.periods.booksBody}>
        <div className="space-y-4">
          {obe && !obe.cleared && (
            <p className="flex items-start gap-2 rounded-md bg-warning-bg px-3 py-2 text-[13px] text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {t(dict.periods.obeWarning, { code: obe.code, amount: `${formatAmount(obe.balance, books.currency)} ${books.currency}` })}{" "}
                <Link href={`/accounts/${obe.accountId}`} className="underline underline-offset-2">
                  {dict.accounts.statement}
                </Link>
              </span>
            </p>
          )}
          <BooksForm books={books} canEdit={ws.can(Perm.BOOKS_CLOSE)} />
        </div>
      </Card>

      {years.map((year) => {
        const preview = previews.get(year.id)!;
        const closed = year.status === "CLOSED";
        return (
          <Card
            key={year.id}
            title={
              <span className="flex items-center gap-2">
                {dict.periods.year} {year.name}
                <Badge tone={closed ? "neutral" : "success"}>{closed ? dict.periods.closed : dict.periods.open}</Badge>
              </span>
            }
            description={
              <>
                <span className="num">
                  {year.startDate} → {year.endDate}
                </span>
                {closed && year.closedAt && <> · {t(dict.periods.closedOn, { date: formatDate(year.closedAt, locale) })}</>}
              </>
            }
            actions={closesBooks && (closed ? <ReopenYearDialog preview={preview} /> : <CloseYearDialog preview={preview} />)}
            flush
          >
            {closed && (
              <div className="border-b border-line px-5 py-4">
                <p className="mb-2 text-[12.5px] text-muted">{dict.periods.result}</p>
                <div className="max-w-xl">
                  <YearResult preview={preview} />
                </div>
              </div>
            )}
            <ol className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {year.periods.map((period) => {
                const current = period.startDate <= today && today <= period.endDate;
                const periodClosed = period.status === "CLOSED";
                const locked = lockedThrough !== undefined && period.startDate <= lockedThrough;
                const label = month.format(new Date(`${period.startDate}T00:00:00Z`));
                return (
                  <li
                    key={period.id}
                    className={cn("flex items-center justify-between gap-3 bg-surface px-5 py-4", current && "bg-accent-soft/50")}
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        <span className="num w-6 font-mono text-[12px] text-muted">{String(period.number).padStart(2, "0")}</span>
                        {label}
                        {current && <span aria-hidden className="size-1.5 rounded-full bg-ink" />}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                        {periodClosed ? <Lock className="size-3.5" aria-hidden /> : <LockOpen className="size-3.5" aria-hidden />}
                        {periodClosed ? dict.periods.closed : dict.periods.open}
                        {locked && <span className="ms-1 rounded bg-surface-2 px-1.5 text-[11px]">{dict.periods.lockDate}</span>}
                      </p>
                    </div>
                    {managesPeriods && !closed && !locked &&
                      (periodClosed ? <ReopenPeriodDialog id={period.id} label={`${label} ${year.name}`} /> : <ClosePeriodButton id={period.id} />)}
                  </li>
                );
              })}
            </ol>
          </Card>
        );
      })}
    </div>
  );
}
