import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { Pagination } from "@/components/ui/pagination";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { CustomerPayment, Page } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.payments.title };
}

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const ws = await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.PAYMENTS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const result = await userApi<Page<CustomerPayment>>("/customer-payments", { query: { page, pageSize: 25 } });
  const p = dict.payments;
  const canCreate = ws.can(Perm.PAYMENTS_MANAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.sales}
        title={p.title}
        description={p.subtitle}
        actions={
          canCreate && (
            <ButtonLink href="/payments/new">
              <Plus className="size-4" aria-hidden />
              {p.newPayment}
            </ButtonLink>
          )
        }
      />
      <Card flush>
        {result.items.length === 0 ? (
          <EmptyState title={p.noPayments}>{p.noPaymentsBody}</EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{p.number}</Th>
                  <Th>{p.date}</Th>
                  <Th>{p.customer}</Th>
                  <Th className="hidden md:table-cell">{p.method}</Th>
                  <Th>{dict.common.status}</Th>
                  <Th align="right">{p.amount}</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((pay) => (
                  <tr key={pay.id} className="relative hover:bg-surface-2/50">
                    <Td>
                      <Link href={`/payments/${pay.id}`} className="font-mono text-[12.5px] after:absolute after:inset-0 hover:underline">
                        <span className="num">{pay.number}</span>
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDate(pay.date, locale)}</Td>
                    <Td>{localName(pay.contact, locale)}</Td>
                    <Td className="hidden text-ink-2 md:table-cell">{dict.invoices.paymentMeans[pay.method]}</Td>
                    <Td>
                      <Badge tone={pay.status === "POSTED" ? "success" : "neutral"}>{p.statuses[pay.status]}</Badge>
                    </Td>
                    <Td align="right">
                      <Amount value={pay.amount} currency={pay.currency} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={result.meta} basePath="/payments" params={{}} />
          </>
        )}
      </Card>
    </div>
  );
}
