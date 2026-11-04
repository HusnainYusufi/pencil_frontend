import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { isoDate, localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { Account, Contact, Page, PurchaseSummary } from "@/lib/types";
import { PayForm } from "./pay-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.purchases.newPayment };
}

export default async function NewSupplierPaymentPage({ searchParams }: PageProps<"/supplier-payments/new">) {
  const ws = await requireAccess({ feature: Feat.BILLS, permission: Perm.BILLS_MANAGE });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const contactId = typeof params.contact === "string" && isUuid(params.contact) ? params.contact : undefined;
  const [suppliers, accounts, open] = await Promise.all([
    userApi<Page<Contact>>("/contacts", { query: { suppliers: true, pageSize: 100 } }),
    userApi<Account[]>("/accounts", { query: { postableOnly: true } }),
    contactId ? userApi<Page<PurchaseSummary>>("/purchase-bills", { query: { contactId, open: true, pageSize: 100 } }) : Promise.resolve(null),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/supplier-payments" className="hover:text-ink">
            {dict.purchases.paymentsTitle}
          </Link>
        }
        title={dict.purchases.newPayment}
        description={dict.purchases.paymentsSubtitle}
      />
      <PayForm
        key={contactId ?? "none"}
        suppliers={suppliers.items.map((s) => ({ id: s.id, label: localName(s, locale) }))}
        accounts={accounts.filter((a) => a.isActive && (a.subtype === "CASH" || a.subtype === "BANK")).map((a) => ({ id: a.id, label: `${a.code} · ${localName(a, locale)}` }))}
        contactId={contactId}
        bills={(open?.items ?? []).map((b) => ({ id: b.id, number: b.number ?? "", supplierReference: b.supplierReference, billDate: b.billDate, dueDate: b.dueDate, balanceDue: b.balanceDue }))}
        preselect={typeof params.bill === "string" ? params.bill : undefined}
        currency={ws.company.baseCurrency}
        today={isoDate(requestNow())}
      />
    </div>
  );
}
