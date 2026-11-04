import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { EInvoiceBadge, InvoiceStatusBadge } from "@/components/sales/badges";
import { FormMessage } from "@/components/ui/interactive";
import { Pagination } from "@/components/ui/pagination";
import { Button, ButtonLink, Card, cn, EmptyState, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { DATE_ONLY } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { Page, SalesDocumentType, SalesInvoiceStatus, SalesInvoiceSummary } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.invoices.title };
}

const STATUSES: SalesInvoiceStatus[] = ["DRAFT", "ISSUED", "VOID"];
const TYPES: SalesDocumentType[] = ["INVOICE", "CREDIT_NOTE", "DEBIT_NOTE"];

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const ws = await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.INVOICES_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const iv = dict.invoices;
  const status = STATUSES.find((s) => s === params.status);
  const type = TYPES.find((s) => s === params.type);
  const open = params.open === "1";
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const from = typeof params.from === "string" && DATE_ONLY.test(params.from) ? params.from : undefined;
  const to = typeof params.to === "string" && DATE_ONLY.test(params.to) ? params.to : undefined;
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const result = await userApi<Page<SalesInvoiceSummary>>("/sales-invoices", {
    query: { status, type, open: open || undefined, search: search || undefined, from, to, page, pageSize: 25 },
  });
  const filters = { status, type, open: open ? "1" : undefined, q: search || undefined, from, to };
  const href = (patch: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, ...patch })) if (v) query.set(k, v);
    const qs = query.toString();
    return qs ? `/invoices?${qs}` : "/invoices";
  };
  const canCreate = ws.can(Perm.INVOICES_MANAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.sales}
        title={iv.title}
        description={iv.subtitle}
        actions={
          canCreate && (
            <ButtonLink href="/invoices/new">
              <Plus className="size-4" aria-hidden />
              {iv.newInvoice}
            </ButtonLink>
          )
        }
      />
      {params.done === "deleted" && <FormMessage tone="success">{iv.draftDeleted}</FormMessage>}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <nav aria-label={dict.common.status} className="flex flex-wrap gap-1">
          {[undefined, ...STATUSES].map((value) => (
            <Link
              key={value ?? "all"}
              href={href({ status: value, open: undefined })}
              aria-current={status === value && !open ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150",
                status === value && !open ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {value ? iv.statuses[value] : iv.filterAll}
            </Link>
          ))}
          <Link
            href={href({ open: "1", status: undefined })}
            aria-current={open ? "page" : undefined}
            className={cn("rounded-full px-3 py-1.5 text-[13px]", open ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}
          >
            {iv.openOnly}
          </Link>
        </nav>
        <form className="flex flex-wrap items-end gap-2" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          {open && <input type="hidden" name="open" value="1" />}
          <Select name="type" defaultValue={type ?? ""} aria-label={iv.types.INVOICE} className="w-40">
            <option value="">{iv.filterAll}</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {iv.types[t]}
              </option>
            ))}
          </Select>
          <Input name="q" defaultValue={search} aria-label={dict.common.search} placeholder={dict.common.search} className="w-48" />
          <Input type="date" name="from" defaultValue={from} aria-label={dict.common.from} className="w-40" />
          <Input type="date" name="to" defaultValue={to} aria-label={dict.common.to} className="w-40" />
          <Button type="submit" variant="secondary">
            {dict.common.apply}
          </Button>
        </form>
      </div>

      <Card flush>
        {result.items.length === 0 ? (
          <EmptyState
            title={iv.noDocuments}
            action={
              canCreate && (
                <ButtonLink href="/invoices/new" variant="secondary">
                  {iv.newInvoice}
                </ButtonLink>
              )
            }
          >
            {iv.noDocumentsBody}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{iv.number}</Th>
                  <Th>{dict.common.date}</Th>
                  <Th>{iv.customer}</Th>
                  <Th>{dict.common.status}</Th>
                  <Th className="hidden lg:table-cell">{iv.einvoice}</Th>
                  <Th align="right">{iv.total}</Th>
                  <Th align="right">{iv.balanceDue}</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((doc) => (
                  <tr key={doc.id} className="relative hover:bg-surface-2/50">
                    <Td>
                      <Link href={`/invoices/${doc.id}`} className="font-mono text-[12.5px] after:absolute after:inset-0 hover:underline">
                        <span className="num">{doc.number ?? iv.statuses.DRAFT}</span>
                      </Link>
                      {doc.type !== "INVOICE" && <span className="ms-2 text-[12px] text-muted">{iv.types[doc.type]}</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDate(doc.issueDate, locale)}</Td>
                    <Td className="max-w-[16rem] truncate">{doc.contact ? localName(doc.contact, locale) : <span className="text-muted">{iv.walkIn}</span>}</Td>
                    <Td>
                      <InvoiceStatusBadge status={doc.status} />
                    </Td>
                    <Td className="hidden lg:table-cell">
                      <EInvoiceBadge status={doc.einvoiceStatus} />
                    </Td>
                    <Td align="right">
                      <Amount value={doc.total} currency={doc.currency} />
                    </Td>
                    <Td align="right">
                      <Amount value={doc.status === "ISSUED" ? doc.balanceDue : "0"} currency={doc.currency} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={result.meta} basePath="/invoices" params={filters} />
          </>
        )}
      </Card>
    </div>
  );
}
