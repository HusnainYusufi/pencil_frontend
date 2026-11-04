import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { isoDate } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { SalesInvoiceDetail } from "@/lib/types";
import { invoiceFormOptions } from "../../form-options";
import { InvoiceForm } from "../../invoice-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.common.edit };
}

export default async function EditInvoicePage({ params }: PageProps<"/invoices/[id]/edit">) {
  const ws = await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.INVOICES_MANAGE });
  const [{ id }, { dict, locale }] = await Promise.all([params, getI18n()]);
  if (!isUuid(id)) notFound();
  const draft = await userApi<SalesInvoiceDetail>(`/sales-invoices/${id}`);
  if (draft.status !== "DRAFT") redirect(`/invoices/${id}`);
  const options = await invoiceFormOptions(ws, locale);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/invoices/${id}`} className="hover:text-ink">
            {dict.invoices.types[draft.type]}
          </Link>
        }
        title={dict.common.edit}
      />
      <InvoiceForm
        type={draft.type}
        {...options}
        currency={draft.currency}
        today={isoDate(requestNow())}
        draft={draft}
        original={
          draft.originalInvoice
            ? { id: draft.originalInvoice.id, number: draft.originalInvoice.number ?? "", contactId: draft.contact?.id ?? null, kind: draft.kind }
            : undefined
        }
      />
    </div>
  );
}
