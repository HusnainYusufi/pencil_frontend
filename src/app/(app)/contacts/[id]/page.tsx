import { CheckCircle2, Pencil, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Amount } from "@/components/amount";
import { JournalSourceLabel } from "@/components/journal-badges";
import { FormMessage } from "@/components/ui/interactive";
import { Badge, Button, ButtonLink, Card, DataList, EmptyState, Input, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { DATE_ONLY, isUuid } from "@/lib/actions";
import { ApiError } from "@/lib/api";
import { requireAccess, userApi } from "@/lib/dal";
import { countryOptions, localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { Contact, ContactStatement, TaxCode } from "@/lib/types";
import { setContactActive } from "../actions";
import { ContactForm } from "../contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.contacts.title };
}

export default async function ContactPage({ params, searchParams }: PageProps<"/contacts/[id]">) {
  const ws = await requireAccess({ feature: Feat.CONTACTS, permission: Perm.CONTACTS_READ });
  const [{ id }, query, { dict, locale }] = await Promise.all([params, searchParams, getI18n()]);
  if (!isUuid(id)) notFound();
  const c = dict.contacts;
  const editing = query.edit === "1" && ws.can(Perm.CONTACTS_MANAGE);
  const from = typeof query.from === "string" && DATE_ONLY.test(query.from) ? query.from : undefined;
  const to = typeof query.to === "string" && DATE_ONLY.test(query.to) ? query.to : undefined;

  let contact: Contact;
  try {
    contact = await userApi<Contact>(`/contacts/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  if (editing) {
    const withholding = ws.has(Feat.TAX_CODES) && ws.can(Perm.TAXES_READ) ? await userApi<TaxCode[]>("/tax-codes", { query: { kind: "WITHHOLDING" } }) : [];
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={
            <Link href={`/contacts/${id}`} className="hover:text-ink">
              {localName(contact, locale)}
            </Link>
          }
          title={c.editContact}
        />
        <ContactForm contact={contact} companyCountry={ws.company.country} withholdingCodes={withholding} countries={countryOptions(locale)} />
      </div>
    );
  }

  const statement = await userApi<ContactStatement>(`/contacts/${id}/statement`, { query: { from, to } });
  const currency = statement.currency;
  const readiness = contact.einvoiceReadiness;
  const missing = c.missing as Record<string, string>;
  const regionName = new Intl.DisplayNames([locale], { type: "region" });
  const address = [contact.buildingNumber, contact.street, contact.district, contact.city, contact.postalCode].filter(Boolean).join(locale === "ar" ? "، " : ", ");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/contacts" className="hover:text-ink">
            {c.title}
          </Link>
        }
        title={localName(contact, locale)}
        description={[contact.isCustomer && c.customer, contact.isSupplier && c.supplier, contact.type === "INDIVIDUAL" ? c.individual : c.business].filter(Boolean).join(" · ")}
        actions={
          ws.can(Perm.CONTACTS_MANAGE) && (
            <>
              <form action={setContactActive}>
                <input type="hidden" name="id" value={contact.id} />
                <input type="hidden" name="active" value={String(!contact.isActive)} />
                <Button type="submit" variant="ghost">
                  {contact.isActive ? c.deactivate : c.activate}
                </Button>
              </form>
              <ButtonLink href={`/contacts/${id}?edit=1`} variant="secondary">
                <Pencil className="size-4" aria-hidden />
                {dict.common.edit}
              </ButtonLink>
            </>
          )
        }
      />

      {query.saved === "1" && <FormMessage tone="success">{c.created}</FormMessage>}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {[
              [c.receivable, contact.balances.receivable],
              [c.payable, contact.balances.payable],
            ].map(([label, value]) => (
              <div key={label} className="bg-surface px-5 py-4">
                <p className="text-[12.5px] text-muted">{label}</p>
                <p className="mt-1 text-[24px] font-semibold">
                  <Amount value={value!} currency={currency} showCurrency />
                </p>
              </div>
            ))}
          </div>

          <Card title={c.statement} flush>
            <form className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-3">
              <label className="space-y-1 text-[12.5px] font-medium">
                <span className="block">{dict.common.from}</span>
                <Input type="date" name="from" defaultValue={statement.from} className="h-9 w-40" />
              </label>
              <label className="space-y-1 text-[12.5px] font-medium">
                <span className="block">{dict.common.to}</span>
                <Input type="date" name="to" defaultValue={statement.to} className="h-9 w-40" />
              </label>
              <Button type="submit" variant="secondary" size="sm">
                {dict.common.apply}
              </Button>
            </form>
            {statement.items.length === 0 ? (
              <EmptyState title={c.noActivity} />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{dict.common.date}</Th>
                    <Th>{dict.statement.entry}</Th>
                    <Th className="hidden md:table-cell">{dict.journals.source}</Th>
                    <Th align="right">{dict.statement.debit}</Th>
                    <Th align="right">{dict.statement.credit}</Th>
                    <Th align="right">{c.balance}</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-surface-2/30 text-ink-2">
                    <Td colSpan={5}>{dict.statement.opening}</Td>
                    <Td align="right">
                      <Amount value={statement.openingBalance} currency={currency} />
                    </Td>
                  </tr>
                  {statement.items.map((row) => (
                    <tr key={row.id}>
                      <Td className="whitespace-nowrap text-ink-2">{formatDate(row.date, locale)}</Td>
                      <Td>
                        <Link href={`/journals/${row.journalEntryId}`} className="font-mono text-[12.5px] hover:underline">
                          <span className="num">{row.number}</span>
                        </Link>
                        <div className="text-[12px] text-muted">{row.description ?? "—"}</div>
                      </Td>
                      <Td className="hidden md:table-cell">
                        <JournalSourceLabel source={row.source} />
                      </Td>
                      <Td align="right">
                        <Amount value={row.debit} currency={currency} blankZero />
                      </Td>
                      <Td align="right">
                        <Amount value={row.credit} currency={currency} blankZero />
                      </Td>
                      <Td align="right" className="font-medium">
                        <Amount value={row.balance} currency={currency} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {contact.isCustomer && (
            <Card title={c.readiness}>
              <p className="flex items-center gap-2 text-[13px]">
                {readiness.ready ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <TriangleAlert className="size-4 text-warning" aria-hidden />}
                <span className="font-medium">{readiness.ready ? c.ready : c.notReady}</span>
                {readiness.invoiceType && <Badge tone="neutral">{(c.invoiceTypes as Record<string, string>)[readiness.invoiceType]}</Badge>}
              </p>
              {readiness.missing.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 ps-5 text-[13px] text-ink-2">
                  {readiness.missing.map((field) => (
                    <li key={field}>{missing[field] ?? field}</li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          <Card>
            <DataList
              items={[
                { label: c.code, value: contact.code, mono: true },
                { label: c.taxNumber, value: contact.taxNumber && <span className="num">{contact.taxNumber}</span> },
                {
                  label: c.idNumber,
                  value: contact.idScheme && (
                    <>
                      {(c.idSchemes as Record<string, string>)[contact.idScheme]} · <span className="num">{contact.idNumber}</span>
                    </>
                  ),
                },
                { label: c.country, value: regionName.of(contact.country) },
                { label: c.address, value: address || null },
                { label: c.email, value: contact.email && <span dir="ltr">{contact.email}</span> },
                { label: c.phone, value: contact.phone && <span className="num">{contact.phone}</span> },
                { label: c.paymentTerms, value: <span className="num">{contact.paymentTermsDays}</span> },
                ...(contact.isSupplier ? [{ label: c.withholding, value: contact.withholdingTaxCode?.code ?? null }] : []),
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
