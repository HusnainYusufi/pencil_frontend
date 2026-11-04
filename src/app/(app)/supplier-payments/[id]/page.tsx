import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Amount } from "@/components/amount";
import { FormMessage } from "@/components/ui/interactive";
import { Badge, Card, DataList, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { SupplierPayment } from "@/lib/types";
import { VoidSupplierPayment } from "./void-button";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.purchases.paymentsTitle };
}

export default async function SupplierPaymentPage({ params, searchParams }: PageProps<"/supplier-payments/[id]">) {
  const ws = await requireAccess({ feature: Feat.BILLS, permission: Perm.BILLS_READ });
  const [{ id }, query, { dict, t, locale }] = await Promise.all([params, searchParams, getI18n()]);
  if (!isUuid(id)) notFound();
  const pay = await userApi<SupplierPayment>(`/supplier-payments/${id}`);
  const p = dict.payments;
  const done = query.done === "recorded" ? t(p.recorded, { number: pay.number }) : query.done === "voided" ? p.voided : undefined;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/supplier-payments" className="hover:text-ink">
            {dict.purchases.paymentsTitle}
          </Link>
        }
        title={<span className="num">{pay.number}</span>}
        description={localName(pay.contact, locale)}
        actions={pay.status === "POSTED" && ws.can(Perm.BILLS_MANAGE) && <VoidSupplierPayment id={pay.id} />}
      />
      {done && <FormMessage tone="success">{done}</FormMessage>}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card title={p.allocations} flush className="min-w-0">
          <Table>
            <thead>
              <tr>
                <Th>{dict.purchases.number}</Th>
                <Th>{dict.purchases.supplierReference}</Th>
                <Th align="right">{dict.invoices.total}</Th>
                <Th align="right">{p.allocated}</Th>
              </tr>
            </thead>
            <tbody>
              {pay.allocations.map((a) => (
                <tr key={a.bill.id}>
                  <Td>
                    <Link href={`/bills/${a.bill.id}`} className="font-mono text-[12.5px] hover:underline">
                      <span className="num">{a.bill.number}</span>
                    </Link>
                  </Td>
                  <Td className="num font-mono text-[12.5px]">{a.bill.supplierReference ?? "—"}</Td>
                  <Td align="right"><Amount value={a.bill.total} currency={pay.currency} /></Td>
                  <Td align="right"><Amount value={a.amount} currency={pay.currency} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <DataList
            items={[
              { label: dict.common.status, value: <Badge tone={pay.status === "POSTED" ? "success" : "neutral"}>{p.statuses[pay.status]}</Badge> },
              { label: p.amount, value: <Amount value={pay.amount} currency={pay.currency} showCurrency className="font-semibold" /> },
              { label: p.date, value: formatDate(pay.date, locale) },
              { label: p.method, value: dict.invoices.paymentMeans[pay.method] },
              { label: dict.purchases.payFrom, value: `${pay.account.code} · ${localName(pay.account, locale)}` },
              { label: p.reference, value: pay.reference },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
