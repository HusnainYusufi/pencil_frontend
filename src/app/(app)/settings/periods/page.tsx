import { Lock, LockOpen, Plus } from "lucide-react";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/interactive";
import { Badge, Card, cn, PageHeader } from "@/components/ui/primitives";
import { intlLocale } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { isoDate } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { FiscalYear } from "@/lib/types";
import { openNextYear, setPeriodStatus } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.periods.title };
}

export default async function PeriodsPage() {
  const ws = await requireAccess({ permission: Perm.JOURNALS_READ });
  const { dict, locale } = await getI18n();
  const years = await userApi<FiscalYear[]>("/fiscal-years");
  const canManage = ws.has(Feat.FISCAL_PERIODS) && ws.can(Perm.PERIODS_MANAGE);
  const today = isoDate(requestNow());
  const month = new Intl.DateTimeFormat(intlLocale(locale), { month: "long", timeZone: "UTC" });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.settings}
        title={dict.periods.title}
        description={dict.periods.subtitle}
        actions={
          canManage && (
            <form action={openNextYear}>
              <SubmitButton variant="secondary">
                <Plus className="size-4" aria-hidden />
                {dict.periods.newYear}
              </SubmitButton>
            </form>
          )
        }
      />

      {[...years].reverse().map((year) => (
        <Card
          key={year.id}
          title={`${dict.periods.year} ${year.name}`}
          description={
            <span className="num">
              {year.startDate} → {year.endDate}
            </span>
          }
          actions={<Badge tone={year.status === "OPEN" ? "success" : "neutral"}>{year.status === "OPEN" ? dict.periods.open : dict.periods.closed}</Badge>}
          flush
        >
          <ol className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {year.periods.map((period) => {
              const current = period.startDate <= today && today <= period.endDate;
              const closed = period.status === "CLOSED";
              return (
                <li key={period.id} className={cn("flex items-center justify-between gap-3 bg-surface px-5 py-4", current && "bg-accent-soft/50")}>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="num w-6 font-mono text-[12px] text-muted">{String(period.number).padStart(2, "0")}</span>
                      {month.format(new Date(`${period.startDate}T00:00:00Z`))}
                      {current && <span aria-hidden className="size-1.5 rounded-full bg-ink" />}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                      {closed ? <Lock className="size-3.5" aria-hidden /> : <LockOpen className="size-3.5" aria-hidden />}
                      {closed ? dict.periods.closed : dict.periods.open}
                    </p>
                  </div>
                  {canManage && (
                    <form action={setPeriodStatus}>
                      <input type="hidden" name="id" value={period.id} />
                      <input type="hidden" name="action" value={closed ? "reopen" : "close"} />
                      <SubmitButton variant="secondary" size="sm">
                        {closed ? dict.periods.reopen : dict.periods.close}
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      ))}
    </div>
  );
}
