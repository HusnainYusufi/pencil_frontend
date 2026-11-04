import { FilePlus2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Amount } from "@/components/amount";
import { EInvoiceBadge, InvoiceStatusBadge } from "@/components/sales/badges";
import { FormMessage, SubmitButton } from "@/components/ui/interactive";
import { ButtonLink, Card, DataList, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { ApiError } from "@/lib/api";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { Contact, Page, SalesInvoiceSummary } from "@/lib/types";
import { setCustomerActive } from "../actions";
import { CustomerForm } from "../customer-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.customers.title };
}

export default async function CustomerPage({ params, searchParams }: PageProps<"/customers/[id]">) {
  const ws = await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.CONTACTS_READ });
  const [{ id }, query, { dict, locale }] = await Promise.all([params, searchParams, getI18n()]);
  if (!isUuid(id)) notFound();

  let contact: Contact;
  try {
    contact = await userApi<Contact>(`/contacts/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const canInvoice = ws.can(Perm.INVOICES_READ);
  const documents = canInvoice
    ? await userApi<Page<SalesInvoiceSummary>>("/sales-invoices", { query: { contactId: id, pageSize: 50 } })
    : null;
  const canManage = ws.can(Perm.CONTACTS_MANAGE);
  const c = dict.customers;
  const currency = ws.company.baseCurrency;
  const address = [contact.address.street, contact.address.buildingNumber, contact.address.district, contact.address.city, contact.address.postalCode, contact.address.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/customers" className="hover:text-ink">
            {c.title}
          </Link>
        }
        title={localName(contact, locale)}
        actions={
          <>
            {canManage && (
              <form action={setCustomerActive}>
                <input type="hidden" name="id" value={contact.id} />
                <input type="hidden" name="active" value={contact.isActive ? "false" : "true"} />
                <SubmitButton variant="secondary">{contact.isActive ? c.deactivate : c.activate}</SubmitButton>
              </form>
            )}
            {ws.can(Perm.INVOICES_MANAGE) && contact.isActive && (
              <ButtonLink href={`/invoices/new?contact=${contact.id}`}>
                <FilePlus2 className="size-4" aria-hidden />
                {dict.invoices.newInvoice}
              </ButtonLink>
            )}
          </>
        }
      />
      {query.done === "saved" && <FormMessage tone="success">{c.saved}</FormMessage>}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card title={c.documents} flush className="min-w-0">
          {!documents || documents.items.length === 0 ? (
            <EmptyState title={dict.invoices.noDocuments} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{dict.invoices.number}</Th>
                  <Th>{dict.common.date}</Th>
                  <Th>{dict.common.status}</Th>
                  <Th className="hidden md:table-cell">{dict.invoices.einvoice}</Th>
                  <Th align="right">{dict.invoices.total}</Th>
                  <Th align="right">{dict.invoices.balanceDue}</Th>
                </tr>
              </thead>
              <tbody>
                {documents.items.map((doc) => (
                  <tr key={doc.id} className="relative hover:bg-surface-2/50">
                    <Td>
                      <Link href={`/invoices/${doc.id}`} className="font-mono text-[12.5px] after:absolute after:inset-0 hover:underline">
                        <span className="num">{doc.number ?? dict.invoices.statuses.DRAFT}</span>
                      </Link>
                      <span className="ms-2 text-[12px] text-muted">{dict.invoices.types[doc.type]}</span>
                    </Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDate(doc.issueDate, locale)}</Td>
                    <Td>
                      <InvoiceStatusBadge status={doc.status} />
                    </Td>
                    <Td className="hidden md:table-cell">
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
          )}
        </Card>

        <Card>
          <DataList
            items={[
              { label: c.balance, value: <Amount value={contact.balance ?? "0"} currency={currency} showCurrency className="font-semibold" /> },
              { label: c.type, value: contact.type === "BUSINESS" ? c.business : c.individual },
              { label: c.taxNumber, value: contact.taxNumber, mono: true },
              { label: c.idScheme, value: contact.idScheme ? `${(c.idSchemes as Record<string, string>)[contact.idScheme]} · ${contact.idNumber}` : null },
              { label: c.email, value: contact.email },
              { label: c.phone, value: contact.phone },
              { label: c.address, value: address || null },
              { label: c.paymentTerms, value: contact.paymentTermsDays?.toString() ?? null },
            ]}
          />
        </Card>
      </div>

      {canManage && (
        <details className="rounded-lg border border-line bg-surface/40 p-5">
          <summary className="cursor-pointer text-[13px] font-semibold">{c.editCustomer}</summary>
          <div className="mt-5">
            <CustomerForm contact={contact} />
          </div>
        </details>
      )}
    </div>
  );
}
