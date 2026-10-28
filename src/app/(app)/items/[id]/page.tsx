import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormMessage } from "@/components/ui/interactive";
import { Button, PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { ApiError } from "@/lib/api";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { Item } from "@/lib/types";
import { setItemActive } from "../actions";
import { ItemForm } from "../item-form";
import { itemFormOptions } from "../options";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.items.editItem };
}

/** Items are edited in place: the form is the detail view. */
export default async function ItemPage({ params, searchParams }: PageProps<"/items/[id]">) {
  const ws = await requireAccess({ feature: Feat.ITEMS, permission: Perm.ITEMS_READ });
  const [{ id }, query, { dict, locale }] = await Promise.all([params, searchParams, getI18n()]);
  if (!isUuid(id)) notFound();

  let item: Item;
  try {
    item = await userApi<Item>(`/items/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const canManage = ws.can(Perm.ITEMS_MANAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/items" className="hover:text-ink">
            {dict.items.title}
          </Link>
        }
        title={localName(item, locale)}
        description={<span className="num font-mono">{item.code}</span>}
        actions={
          canManage && (
            <form action={setItemActive}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="active" value={String(!item.isActive)} />
              <Button type="submit" variant="ghost">
                {item.isActive ? dict.items.deactivate : dict.items.activate}
              </Button>
            </form>
          )
        }
      />
      {query.saved === "1" && <FormMessage tone="success">{dict.items.saved}</FormMessage>}
      {canManage ? (
        <ItemForm item={item} {...await itemFormOptions(locale)} />
      ) : (
        <p className="text-ink-2">{localName(item, locale)}</p>
      )}
    </div>
  );
}
