import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { Button, Card, cn, Input, PageHeader } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { DATE_ONLY } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import type { BalanceSheet } from "@/lib/types";
import { SectionRows, TotalRow } from "../statement-table";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.nav.balanceSheet };
}

export default async function BalanceSheetPage({ searchParams }: PageProps<"/reports/balance-sheet">) {
  const ws = await requireAccess({ feature: Feat.FINANCIAL_STATEMENTS, permission: Perm.REPORTS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const asOf = typeof params.asOf === "string" && DATE_ONLY.test(params.asOf) ? params.asOf : undefined;
  const report = await userApi<BalanceSheet>("/reports/balance-sheet", { query: { asOf } });
  const st = dict.statements;
  const c = report.currency;
  const section = (key: keyof typeof st.sections) => (
    <SectionRows
      title={st.sections[key]}
      section={report.sections.find((s) => s.key === key)!}
      currency={c}
      locale={locale}
      compare={false}
      linkAccounts={ws.can(Perm.ACCOUNTS_READ)}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={dict.nav.reports} title={dict.nav.balanceSheet} description={`${st.bsSubtitle} ${st.asOf} ${formatDate(report.asOf, locale)}`} />
      <form className="flex flex-wrap items-end gap-2">
        <Input type="date" name="asOf" defaultValue={report.asOf} aria-label={st.asOf} className="w-40" />
        <Button type="submit" variant="secondary">
          {dict.common.apply}
        </Button>
      </form>
      <p role="status" className={cn("flex items-center gap-2 text-[13px]", report.balanced ? "text-success" : "text-danger")}>
        {report.balanced ? <CheckCircle2 className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
        {report.balanced ? st.balanced : st.unbalanced}
      </p>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card flush>
          <table className="w-full border-collapse text-[13.5px]">
            <tbody>
              {section("currentAssets")}
              {section("nonCurrentAssets")}
              <TotalRow label={st.totalAssets} value={report.totalAssets} currency={c} />
            </tbody>
          </table>
        </Card>
        <Card flush>
          <table className="w-full border-collapse text-[13.5px]">
            <tbody>
              {section("currentLiabilities")}
              {section("nonCurrentLiabilities")}
              <TotalRow label={st.totalLiabilities} value={report.totalLiabilities} currency={c} />
              {section("equity")}
              <TotalRow label={st.totalEquity} value={report.totalEquity} currency={c} />
              <TotalRow label={st.totalLiabilitiesAndEquity} value={report.totalLiabilitiesAndEquity} currency={c} />
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
