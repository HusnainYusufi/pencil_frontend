import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { isoDate } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { SalesDocumentType, SalesInvoiceDetail } from "@/lib/types";
import { invoiceFormOptions } from "../form-options";
import { InvoiceForm } from "../invoice-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.invoices.newInvoice };
}

export default async function NewInvoicePage({ searchParams }: PageProps<"/invoices/new">) {
  const ws = await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.INVOICES_MANAGE });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const type: SalesDocumentType = params.type === "CREDIT_NOTE" || params.type === "DEBIT_NOTE" ? params.type : "INVOICE";
  const originalId = typeof params.original === "string" ? params.original : undefined;
  const contactId = typeof params.contact === "string" && isUuid(params.contact) ? params.contact : undefined;

  let original: SalesInvoiceDetail | undefined;
  if (type !== "INVOICE") {
    if (!originalId || !isUuid(originalId)) notFound();
    original = await userApi<SalesInvoiceDetail>(`/sales-invoices/${originalId}`);
    if (original.status !== "ISSUED" || original.type !== "INVOICE") notFound();
  }
  const options = await invoiceFormOptions(ws, locale);
  const title = type === "CREDIT_NOTE" ? dict.invoices.newCreditNote : type === "DEBIT_NOTE" ? dict.invoices.newDebitNote : dict.invoices.newInvoice;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/invoices" className="hover:text-ink">
            {dict.invoices.title}
          </Link>
        }
        title={title}
        description={dict.invoices.subtitle}
      />
      <InvoiceForm
        type={type}
        {...options}
        currency={ws.company.baseCurrency}
        today={isoDate(requestNow())}
        defaultContactId={contactId}
        original={original && { id: original.id, number: original.number ?? "", contactId: original.contact?.id ?? null, kind: original.kind }}
      />
    </div>
  );
}
