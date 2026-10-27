import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { Button, Card, cn, EmptyState, Input, PageHeader } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { DATE_ONLY } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { indentClass, localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { DebitCredit, TrialBalance } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.trialBalance.title };
}

const groupHead = "border-b border-line bg-surface-2/60 px-4 pt-2.5 pb-1 text-center font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted";
const subHead = "border-b border-line bg-surface-2/60 px-4 pb-2.5 pt-1 text-end font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted";
const cell = "border-b border-line px-4 py-2.5 text-end tabular";

export default async function TrialBalancePage({ searchParams }: PageProps<"/reports/trial-balance">) {
  const ws = await requireAccess({ feature: Feat.LEDGER_REPORTS, permission: Perm.REPORTS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const from = typeof params.from === "string" && DATE_ONLY.test(params.from) ? params.from : undefined;
  const to = typeof params.to === "string" && DATE_ONLY.test(params.to) ? params.to : undefined;
  const includeZero = params.zero === "1";

  const tb = await userApi<TrialBalance>("/reports/trial-balance", { query: { from, to, includeZero } });
  const canStatement = ws.has(Feat.LEDGER_REPORTS);
  /** Debit + credit cells; `divided` draws the column-group rule. */
  const pair = (value: DebitCredit, { strong = false, divided = false } = {}) => (
    <>
      <td className={cn(cell, strong && "font-semibold", divided && "border-s")}>
        <Amount value={value.debit} currency={tb.currency} blankZero={!strong} />
      </td>
      <td className={cn(cell, strong && "font-semibold")}>
        <Amount value={value.credit} currency={tb.currency} blankZero={!strong} />
      </td>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={dict.nav.reports} title={dict.trialBalance.title} description={dict.trialBalance.subtitle} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5 text-[13px] font-medium">
            <span className="block">{dict.common.from}</span>
            <Input type="date" name="from" defaultValue={tb.from} className="w-44" />
          </label>
          <label className="space-y-1.5 text-[13px] font-medium">
            <span className="block">{dict.common.to}</span>
            <Input type="date" name="to" defaultValue={tb.to} className="w-44" />
          </label>
          <label className="flex h-10 items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" name="zero" value="1" defaultChecked={includeZero} className="size-4 accent-ink" />
            {dict.trialBalance.includeZero}
          </label>
          <Button type="submit" variant="secondary">
            {dict.common.apply}
          </Button>
        </form>
        <p role="status" className={cn("flex items-center gap-2 text-[13px]", tb.balanced ? "text-success" : "text-danger")}>
          {tb.balanced ? <CheckCircle2 className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
          {tb.balanced ? dict.trialBalance.balanced : dict.trialBalance.unbalanced}
        </p>
      </div>

      <Card
        flush
        title={`${formatDate(tb.from, locale)} → ${formatDate(tb.to, locale)}`}
        actions={<span className="num font-mono text-[12px] text-muted">{tb.currency}</span>}
      >
        {tb.rows.length === 0 ? (
          <EmptyState title={dict.trialBalance.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" className="border-b border-line bg-surface-2/60 px-4 py-2.5 text-start align-bottom font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                    {dict.trialBalance.account}
                  </th>
                  <th colSpan={2} scope="colgroup" className={groupHead}>
                    {dict.trialBalance.opening}
                  </th>
                  <th colSpan={2} scope="colgroup" className={cn(groupHead, "border-s")}>
                    {dict.trialBalance.movement}
                  </th>
                  <th colSpan={2} scope="colgroup" className={cn(groupHead, "border-s")}>
                    {dict.trialBalance.closing}
                  </th>
                </tr>
                <tr>
                  {[0, 1, 2].flatMap((group) => [
                    <th key={`d${group}`} scope="col" className={cn(subHead, group > 0 && "border-s")}>
                      {dict.trialBalance.debit}
                    </th>,
                    <th key={`c${group}`} scope="col" className={subHead}>
                      {dict.trialBalance.credit}
                    </th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {tb.rows.map((row) => (
                  <tr key={row.accountId} className={cn("hover:bg-surface-2/50", row.isGroup && "bg-surface-2/25 font-medium")}>
                    <td className="border-b border-line py-2.5 pe-4">
                      <div className={cn("flex items-baseline gap-2", indentClass(row.depth))}>
                        <span className="num font-mono text-[12px] text-ink-2">{row.code}</span>
                        {canStatement && !row.isGroup ? (
                          <Link href={`/accounts/${row.accountId}?from=${tb.from}&to=${tb.to}`} className="hover:underline">
                            {localName(row, locale)}
                          </Link>
                        ) : (
                          <span>{localName(row, locale)}</span>
                        )}
                      </div>
                    </td>
                    {pair(row.opening)}
                    {pair(row.movement, { divided: true })}
                    {pair(row.closing, { divided: true })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2/60">
                  <td className="px-4 py-3 font-semibold">{dict.common.total}</td>
                  {pair(tb.totals.opening, { strong: true })}
                  {pair(tb.totals.movement, { strong: true, divided: true })}
                  {pair(tb.totals.closing, { strong: true, divided: true })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
