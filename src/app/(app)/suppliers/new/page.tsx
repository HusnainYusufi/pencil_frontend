import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import { CustomerForm } from "../../customers/customer-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.purchases.newSupplier };
}

export default async function NewSupplierPage({ searchParams }: PageProps<"/suppliers/new">) {
  await requireAccess({ feature: Feat.BILLS, permission: Perm.CONTACTS_MANAGE });
  const [{ dict }, params] = await Promise.all([getI18n(), searchParams]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/suppliers" className="hover:text-ink">
            {dict.purchases.suppliersTitle}
          </Link>
        }
        title={dict.purchases.newSupplier}
      />
      <CustomerForm supplier next={params.next === "bill" ? "bill" : undefined} />
    </div>
  );
}
