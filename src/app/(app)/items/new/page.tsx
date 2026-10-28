import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import { ItemForm } from "../item-form";
import { itemFormOptions } from "../options";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.items.newItem };
}

export default async function NewItemPage() {
  await requireAccess({ feature: Feat.ITEMS, permission: Perm.ITEMS_MANAGE });
  const { dict, locale } = await getI18n();
  const options = await itemFormOptions(locale);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/items" className="hover:text-ink">
            {dict.items.title}
          </Link>
        }
        title={dict.items.newItem}
      />
      <ItemForm {...options} />
    </div>
  );
}
