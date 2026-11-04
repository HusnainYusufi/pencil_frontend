import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import { CustomerForm } from "../customer-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.customers.newCustomer };
}

export default async function NewCustomerPage({ searchParams }: PageProps<"/customers/new">) {
  await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.CONTACTS_MANAGE });
  const [{ dict }, params] = await Promise.all([getI18n(), searchParams]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/customers" className="hover:text-ink">
            {dict.customers.title}
          </Link>
        }
        title={dict.customers.newCustomer}
      />
      <CustomerForm next={params.next === "invoice" ? "invoice" : undefined} />
    </div>
  );
}
