import { Plus } from "lucide-react";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { FormMessage } from "@/components/ui/interactive";
import { Pagination } from "@/components/ui/pagination";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th, type Tone } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { userApi, type Workspace } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Perm } from "@/lib/permissions";
import type { Page, PurchaseStatus, PurchaseSummary } from "@/lib/types";

const TONE: Record<PurchaseStatus, Tone> = { DRAFT: "warning", POSTED: "success", VOID: "neutral" };

/** Shared list for bills (with supplier credits) and expenses. */
export async function PurchaseList({ ws, expenses, params }: { ws: Workspace; expenses: boolean; params: Record<string, string | string[] | undefined> }) {
  const { dict, locale } = await getI18n();
  const p = dict.purchases;
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const result = await userApi<Page<PurchaseSummary>>("/purchase-bills", {
    query: { type: expenses ? "EXPENSE" : (params.type === "CREDIT_NOTE" ? "CREDIT_NOTE" : params.type === "BILL" ? "BILL" : undefined), page, pageSize: 25 },
  });
  const items = expenses ? result.items : result.items.filter((i) => i.type !== "EXPENSE");
  const basePath = expenses ? "/expenses" : "/bills";
  const canCreate = ws.can(Perm.BILLS_MANAGE);
  const newHref = expenses ? "/bills/new?type=EXPENSE" : "/bills/new";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.purchases}
        title={expenses ? p.expensesTitle : p.billsTitle}
        description={expenses ? p.expensesSubtitle : p.billsSubtitle}
        actions={
          canCreate && (
            <ButtonLink href={newHref}>
              <Plus className="size-4" aria-hidden />
              {expenses ? p.newExpense : p.newBill}
            </ButtonLink>
          )
        }
      />
      {params.done === "deleted" && <FormMessage tone="success">{p.deleted}</FormMessage>}
      <Card flush>
        {items.length === 0 ? (
          <EmptyState title={expenses ? p.noExpenses : p.noBills} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{p.number}</Th>
                  <Th>{p.billDate}</Th>
                  <Th>{p.supplier}</Th>
                  <Th className="hidden md:table-cell">{p.supplierReference}</Th>
                  <Th>{dict.common.status}</Th>
                  <Th align="right">{dict.invoices.total}</Th>
                  {!expenses && <Th align="right">{dict.invoices.balanceDue}</Th>}
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} className="relative hover:bg-surface-2/50">
                    <Td>
                      <Link href={`/bills/${b.id}`} className="font-mono text-[12.5px] after:absolute after:inset-0 hover:underline">
                        <span className="num">{b.number ?? p.statuses.DRAFT}</span>
                      </Link>
                      {b.type === "CREDIT_NOTE" && <span className="ms-2 text-[12px] text-muted">{p.types.CREDIT_NOTE}</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDate(b.billDate, locale)}</Td>
                    <Td>{b.contact ? localName(b.contact, locale) : "—"}</Td>
                    <Td className="hidden md:table-cell">
                      <span className="num font-mono text-[12.5px]">{b.supplierReference ?? "—"}</span>
                    </Td>
                    <Td>
                      <Badge tone={TONE[b.status]}>{p.statuses[b.status]}</Badge>
                    </Td>
                    <Td align="right">
                      <Amount value={b.total} currency={b.currency} />
                    </Td>
                    {!expenses && (
                      <Td align="right">
                        <Amount value={b.status === "POSTED" && b.type === "BILL" ? b.balanceDue : "0"} currency={b.currency} />
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={result.meta} basePath={basePath} params={{}} />
          </>
        )}
      </Card>
    </div>
  );
}
