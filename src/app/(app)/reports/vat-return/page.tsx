import type { Metadata } from "next";
import { Amount } from "@/components/amount";
import { Button, Card, cn, DataList, Input, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { DATE_ONLY } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { VatReturn } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.vatReturn.title };
}

/** Default: the current calendar quarter. */
function currentQuarter(now: number) {
  const d = new Date(now);
  const q = Math.floor(d.getUTCMonth() / 3);
  const start = new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), q * 3 + 3, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

const SUBTOTAL_BOXES = new Set(["6", "12", "13", "16"]);

export default async function VatReturnPage({ searchParams }: PageProps<"/reports/vat-return">) {
  await requireAccess({ feature: Feat.VAT_RETURNS, permission: Perm.REPORTS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const quarter = currentQuarter(requestNow());
  const from = typeof params.from === "string" && DATE_ONLY.test(params.from) ? params.from : quarter.from;
  const to = typeof params.to === "string" && DATE_ONLY.test(params.to) ? params.to : quarter.to;
  const report = await userApi<VatReturn>("/reports/vat-return", { query: { from, to } });
  const v = dict.vatReturn;
  const c = report.currency;
  const boxes = v.boxes as Record<string, string>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={dict.nav.reports} title={v.title} description={`${v.subtitle} ${formatDate(report.from, locale)} – ${formatDate(report.to, locale)}`} />
      <form className="flex flex-wrap items-end gap-2">
        <Input type="date" name="from" defaultValue={report.from} aria-label={dict.common.from} className="w-40" />
        <Input type="date" name="to" defaultValue={report.to} aria-label={dict.common.to} className="w-40" />
        <Button type="submit" variant="secondary">
          {dict.common.apply}
        </Button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card flush className="min-w-0">
          {report.format === "ZATCA" ? (
            <Table>
              <thead>
                <tr>
                  <Th className="w-14">{v.box}</Th>
                  <Th>{v.description}</Th>
                  <Th align="right">{v.amount}</Th>
                  <Th align="right">{v.adjustment}</Th>
                  <Th align="right">{v.vat}</Th>
                </tr>
              </thead>
              <tbody>
                {report.boxes!.map((b) => {
                  const total = SUBTOTAL_BOXES.has(b.box);
                  const vatOnly = ["13", "14", "15", "16"].includes(b.box);
                  return (
                    <tr key={b.box} className={cn(total && "bg-surface-2/40 font-semibold")}>
                      <Td className="num font-mono text-[12px] text-muted">{b.box}</Td>
                      <Td>{boxes[b.box]}</Td>
                      <Td align="right">{vatOnly ? null : <Amount value={b.amount} currency={c} />}</Td>
                      <Td align="right">{vatOnly ? null : <Amount value={b.adjustment} currency={c} />}</Td>
                      <Td align="right">
                        <Amount value={b.vat} currency={c} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{v.category}</Th>
                  <Th align="right">{v.rate}</Th>
                  <Th align="right">{v.amount}</Th>
                  <Th align="right">{v.adjustment}</Th>
                  <Th align="right">{v.vat}</Th>
                </tr>
              </thead>
              <tbody>
                {report.lines!.map((l) => (
                  <tr key={`${l.side}-${l.category}-${l.percent}`}>
                    <Td>
                      <span className="text-muted">{l.side === "SALES" ? v.sales : v.purchases}</span> · {v.categories[l.category]}
                    </Td>
                    <Td align="right">
                      <span className="num">{l.percent}%</span>
                    </Td>
                    <Td align="right">
                      <Amount value={l.amount} currency={c} />
                    </Td>
                    <Td align="right">
                      <Amount value={l.adjustment} currency={c} />
                    </Td>
                    <Td align="right">
                      <Amount value={l.tax} currency={c} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <DataList
            items={[
              { label: v.outputTax, value: <Amount value={report.outputTax} currency={c} /> },
              { label: v.inputTax, value: <Amount value={report.inputTax} currency={c} /> },
              { label: v.netDue, value: <Amount value={report.netVatDue} currency={c} showCurrency className="font-semibold" /> },
            ]}
          />
          <p className="mt-4 text-[12.5px] text-muted">{report.format === "ZATCA" ? v.zatcaNote : v.refundable}</p>
        </Card>
      </div>
    </div>
  );
}
