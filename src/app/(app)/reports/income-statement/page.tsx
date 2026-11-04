import type { Metadata } from "next";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { DATE_ONLY } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import type { IncomeStatement } from "@/lib/types";
import { SectionRows, TotalRow } from "../statement-table";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.nav.incomeStatement };
}

export default async function IncomeStatementPage({ searchParams }: PageProps<"/reports/income-statement">) {
  const ws = await requireAccess({ feature: Feat.FINANCIAL_STATEMENTS, permission: Perm.REPORTS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const from = typeof params.from === "string" && DATE_ONLY.test(params.from) ? params.from : undefined;
  const to = typeof params.to === "string" && DATE_ONLY.test(params.to) ? params.to : undefined;
  const compare = params.compare === "1";
  const report = await userApi<IncomeStatement>("/reports/income-statement", { query: { from, to, compare: compare || undefined } });
  const st = dict.statements;
  const c = report.currency;
  const section = (key: string) => report.sections.find((s) => s.key === key)!;
  const linkAccounts = ws.can(Perm.ACCOUNTS_READ);
  const rows = (key: keyof typeof st.sections) => (
    <SectionRows title={st.sections[key]} section={section(key)} currency={c} locale={locale} compare={compare} linkAccounts={linkAccounts} />
  );
  const empty = report.sections.every((s) => s.lines.length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.reports}
        title={dict.nav.incomeStatement}
        description={`${st.plSubtitle} ${formatDate(report.from, locale)} – ${formatDate(report.to, locale)}`}
      />
      <form className="flex flex-wrap items-end gap-2">
        <Input type="date" name="from" defaultValue={report.from} aria-label={dict.common.from} className="w-40" />
        <Input type="date" name="to" defaultValue={report.to} aria-label={dict.common.to} className="w-40" />
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" name="compare" value="1" defaultChecked={compare} className="size-4 accent-ink" />
          {st.compare}
        </label>
        <Button type="submit" variant="secondary">
          {dict.common.apply}
        </Button>
      </form>
      <Card flush>
        {empty ? (
          <EmptyState title={st.noActivity} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  <th className="border-b border-line px-4 py-2.5 text-start font-medium" />
                  <th className="border-b border-line px-4 py-2.5 text-end font-medium">{st.current}</th>
                  {compare && <th className="border-b border-line px-4 py-2.5 text-end font-medium">{st.previous}</th>}
                </tr>
              </thead>
              <tbody>
                {rows("revenue")}
                {rows("costOfSales")}
                <TotalRow label={st.grossProfit} value={report.grossProfit} previous={report.previous?.grossProfit} currency={c} />
                {rows("operatingExpenses")}
                <TotalRow label={st.operatingProfit} value={report.operatingProfit} previous={report.previous?.operatingProfit} currency={c} />
                {rows("otherIncome")}
                {rows("otherExpenses")}
                <TotalRow label={st.netProfit} value={report.netProfit} previous={report.previous?.netProfit} currency={c} />
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
