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
import type { PurchaseDetail, PurchaseDocumentType } from "@/lib/types";
import { BillForm } from "../bill-form";
import { billFormOptions } from "../form-options";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.purchases.newBill };
}

export default async function NewBillPage({ searchParams }: PageProps<"/bills/new">) {
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const type: PurchaseDocumentType = params.type === "EXPENSE" || params.type === "CREDIT_NOTE" ? params.type : "BILL";
  const ws = await requireAccess({ feature: type === "EXPENSE" ? Feat.EXPENSES : Feat.BILLS, permission: Perm.BILLS_MANAGE });
  let original: PurchaseDetail | undefined;
  if (type === "CREDIT_NOTE") {
    const id = typeof params.original === "string" ? params.original : "";
    if (!isUuid(id)) notFound();
    original = await userApi<PurchaseDetail>(`/purchase-bills/${id}`);
    if (original.type !== "BILL" || original.status !== "POSTED") notFound();
  }
  const options = await billFormOptions(ws, locale);
  const p = dict.purchases;
  const title = type === "EXPENSE" ? p.newExpense : type === "CREDIT_NOTE" ? p.newCredit : p.newBill;
  const back = type === "EXPENSE" ? "/expenses" : "/bills";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={back} className="hover:text-ink">
            {type === "EXPENSE" ? p.expensesTitle : p.billsTitle}
          </Link>
        }
        title={title}
        description={type === "EXPENSE" ? p.expensesSubtitle : p.billsSubtitle}
      />
      <BillForm
        type={type}
        {...options}
        currency={ws.company.baseCurrency}
        today={isoDate(requestNow())}
        defaultContactId={typeof params.contact === "string" && isUuid(params.contact) ? params.contact : undefined}
        original={original && { id: original.id, number: original.number ?? "", contactId: original.contact?.id ?? null }}
      />
    </div>
  );
}
