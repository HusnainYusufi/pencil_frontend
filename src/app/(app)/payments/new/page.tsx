import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { isoDate, localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { Account, Contact, Page, SalesInvoiceSummary } from "@/lib/types";
import { PaymentForm } from "./payment-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.payments.newPayment };
}

export default async function NewPaymentPage({ searchParams }: PageProps<"/payments/new">) {
  const ws = await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.PAYMENTS_MANAGE });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const contactId = typeof params.contact === "string" && isUuid(params.contact) ? params.contact : undefined;
  const preselect = typeof params.invoice === "string" && isUuid(params.invoice) ? params.invoice : undefined;

  const [contacts, accounts, open] = await Promise.all([
    userApi<Page<Contact>>("/contacts", { query: { customers: true, pageSize: 100 } }),
    userApi<Account[]>("/accounts", { query: { postableOnly: true } }),
    contactId
      ? userApi<Page<SalesInvoiceSummary>>("/sales-invoices", { query: { contactId, open: true, pageSize: 100 } })
      : Promise.resolve(null),
  ]);
  const invoices = (open?.items ?? [])
    .filter((d) => d.type !== "CREDIT_NOTE")
    .map((d) => ({ id: d.id, number: d.number ?? "", issueDate: d.issueDate, dueDate: d.dueDate, balanceDue: d.balanceDue }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/payments" className="hover:text-ink">
            {dict.payments.title}
          </Link>
        }
        title={dict.payments.newPayment}
        description={dict.payments.subtitle}
      />
      <PaymentForm
        key={contactId ?? "none"}
        customers={contacts.items.map((c) => ({ id: c.id, label: localName(c, locale) }))}
        accounts={accounts
          .filter((a) => a.isActive && (a.subtype === "CASH" || a.subtype === "BANK"))
          .map((a) => ({ id: a.id, label: `${a.code} · ${localName(a, locale)}` }))}
        contactId={contactId}
        invoices={invoices}
        preselect={preselect}
        currency={ws.company.baseCurrency}
        today={isoDate(requestNow())}
      />
    </div>
  );
}
