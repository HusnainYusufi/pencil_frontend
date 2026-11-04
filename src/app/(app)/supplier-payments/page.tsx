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
import type { Page, SupplierPayment } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.purchases.paymentsTitle };
}

export default async function SupplierPaymentsPage({ searchParams }: PageProps<"/supplier-payments">) {
  const ws = await requireAccess({ feature: Feat.BILLS, permission: Perm.BILLS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const result = await userApi<Page<SupplierPayment>>("/supplier-payments", { query: { page, pageSize: 25 } });
  const p = dict.purchases;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.purchases}
        title={p.paymentsTitle}
        description={p.paymentsSubtitle}
        actions={
          ws.can(Perm.BILLS_MANAGE) && (
            <ButtonLink href="/supplier-payments/new">
              <Plus className="size-4" aria-hidden />
              {p.newPayment}
            </ButtonLink>
          )
        }
      />
      <Card flush>
        {result.items.length === 0 ? (
          <EmptyState title={p.noPayments} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{p.number}</Th>
                  <Th>{dict.payments.date}</Th>
                  <Th>{p.supplier}</Th>
                  <Th>{dict.common.status}</Th>
                  <Th align="right">{dict.payments.amount}</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((pay) => (
                  <tr key={pay.id} className="relative hover:bg-surface-2/50">
                    <Td>
                      <Link href={`/supplier-payments/${pay.id}`} className="font-mono text-[12.5px] after:absolute after:inset-0 hover:underline">
                        <span className="num">{pay.number}</span>
                      </Link>
                    </Td>
                    <Td className="text-ink-2">{formatDate(pay.date, locale)}</Td>
                    <Td>{localName(pay.contact, locale)}</Td>
                    <Td>
                      <Badge tone={pay.status === "POSTED" ? "success" : "neutral"}>{dict.payments.statuses[pay.status]}</Badge>
                    </Td>
                    <Td align="right">
                      <Amount value={pay.amount} currency={pay.currency} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={result.meta} basePath="/supplier-payments" params={{}} />
          </>
        )}
      </Card>
    </div>
  );
}
