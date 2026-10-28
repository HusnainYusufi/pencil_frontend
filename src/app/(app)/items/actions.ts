"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { assertUuid, isUuid, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import type { Item } from "@/lib/types";

const gate = () => requireAccess({ feature: Feat.ITEMS, permission: Perm.ITEMS_MANAGE });
const PRICE = /^\d{1,15}(\.\d{1,4})?$/;

/**
 * Create or update an item. On create, empty account / tax fields are left
 * out so the API applies the standard defaults; on edit they mean "none".
 */
export async function saveItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict } = await getI18n();
  const id = str(form, "id");
  const editing = isUuid(id);
  const empty = editing ? null : undefined;

  const fieldErrors: Record<string, string> = {};
  const price = (key: string) => {
    const value = str(form, key).replace(/,/g, "");
    if (value && !PRICE.test(value)) fieldErrors[key] = dict.errors.fieldInvalid;
    return value || (editing ? null : undefined);
  };
  const body = {
    code: str(form, "code"),
    type: str(form, "type") === "SERVICE" ? "SERVICE" : "GOODS",
    name: str(form, "name"),
    nameAr: str(form, "nameAr") || empty,
    description: str(form, "description") || empty,
    unitCode: str(form, "unitCode") || undefined,
    salePrice: price("salePrice"),
    purchasePrice: price("purchasePrice"),
    salesAccountId: str(form, "salesAccountId") || empty,
    purchaseAccountId: str(form, "purchaseAccountId") || empty,
    salesTaxCodeId: str(form, "salesTaxCodeId") || empty,
    purchaseTaxCodeId: str(form, "purchaseTaxCodeId") || empty,
  };
  if (!body.code) fieldErrors.code = dict.errors.fieldInvalid;
  if (!body.name) fieldErrors.name = dict.errors.fieldInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  let saved: Item;
  try {
    saved = await userApi<Item>(editing ? `/items/${id}` : "/items", { method: editing ? "PATCH" : "POST", body });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/items");
  redirect(`/items/${saved.id}?saved=1`);
}

export async function setItemActive(form: FormData): Promise<void> {
  await gate();
  const id = assertUuid(str(form, "id"));
  await userApi(`/items/${id}`, { method: "PATCH", body: { isActive: form.get("active") === "true" } });
  revalidatePath("/items");
  revalidatePath(`/items/${id}`);
}
