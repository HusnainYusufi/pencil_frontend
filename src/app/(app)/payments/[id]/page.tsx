import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Amount } from "@/components/amount";
import { FormMessage } from "@/components/ui/interactive";
import { Badge, Card, DataList, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { ApiError } from "@/lib/api";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { CustomerPayment } from "@/lib/types";
import { VoidPaymentDialog } from "./void-dialog";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.payments.title };
}

export default async function PaymentPage({ params, searchParams }: PageProps<"/payments/[id]">) {
  const ws = await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.PAYMENTS_READ });
  const [{ id }, query, { dict, t, locale }] = await Promise.all([params, searchParams, getI18n()]);
  if (!isUuid(id)) notFound();
  let pay: CustomerPayment;
  try {
    pay = await userApi<CustomerPayment>(`/customer-payments/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const p = dict.payments;
  const done = query.done === "recorded" ? t(p.recorded, { number: pay.number }) : query.done === "voided" ? p.voided : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/payments" className="hover:text-ink">
            {p.title}
          </Link>
        }
        title={<span className="num">{pay.number}</span>}
        description={localName(pay.contact, locale)}
        actions={
          pay.status === "POSTED" &&
          ws.can(Perm.PAYMENTS_MANAGE) && (
            <VoidPaymentDialog id={pay.id} />
          )
        }
      />
      {done && <FormMessage tone="success">{done}</FormMessage>}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card title={p.allocations} flush className="min-w-0">
          <Table>
            <thead>
              <tr>
                <Th>{dict.invoices.number}</Th>
                <Th>{dict.common.date}</Th>
                <Th align="right">{dict.invoices.total}</Th>
                <Th align="right">{p.allocated}</Th>
              </tr>
            </thead>
            <tbody>
              {pay.allocations.map((a) => (
                <tr key={a.invoice.id}>
                  <Td>
                    <Link href={`/invoices/${a.invoice.id}`} className="font-mono text-[12.5px] hover:underline">
                      <span className="num">{a.invoice.number}</span>
                    </Link>
                  </Td>
                  <Td className="text-ink-2">{formatDate(a.invoice.issueDate, locale)}</Td>
                  <Td align="right"><Amount value={a.invoice.total} currency={pay.currency} /></Td>
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
              { label: p.depositTo, value: `${pay.account.code} · ${localName(pay.account, locale)}` },
              { label: p.reference, value: pay.reference },
              { label: p.notes, value: pay.notes },
              ...(pay.journalEntry && ws.can(Perm.JOURNALS_READ)
                ? [{
                    label: dict.invoices.journal,
                    value: (
                      <Link href={`/journals/${pay.journalEntry.id}`} className="font-mono text-[13px] underline underline-offset-4">
                        <span className="num">{pay.journalEntry.number}</span>
                      </Link>
                    ),
                  }]
                : []),
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

