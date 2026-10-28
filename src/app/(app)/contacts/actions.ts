"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertUuid, isUuid, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import type { Contact } from "@/lib/types";

const gate = () => requireAccess({ feature: Feat.CONTACTS, permission: Perm.CONTACTS_MANAGE });

const TEXT_FIELDS = [
  "code",
  "name",
  "nameAr",
  "taxNumber",
  "idNumber",
  "buildingNumber",
  "street",
  "district",
  "city",
  "postalCode",
  "additionalNumber",
  "email",
  "phone",
  "notes",
] as const;

/**
 * Create or update a contact. On edit an emptied field is sent as null so it
 * is cleared; on create it is left out. The API validates IDs and addresses
 * against the contact's country and returns field errors.
 */
export async function saveContact(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const id = str(form, "id");
  const editing = isUuid(id);
  const empty = editing ? null : undefined;
  const body: Record<string, unknown> = {
    type: str(form, "type") === "INDIVIDUAL" ? "INDIVIDUAL" : "BUSINESS",
    isCustomer: form.get("isCustomer") === "on",
    isSupplier: form.get("isSupplier") === "on",
    country: str(form, "country") || undefined,
    idScheme: str(form, "idScheme") || empty,
    paymentTermsDays: Number.parseInt(str(form, "paymentTermsDays") || "0", 10) || 0,
    withholdingTaxCodeId: str(form, "withholdingTaxCodeId") || empty,
  };
  for (const field of TEXT_FIELDS) body[field] = str(form, field) || empty;

  let saved: Contact;
  try {
    saved = await userApi<Contact>(editing ? `/contacts/${id}` : "/contacts", { method: editing ? "PATCH" : "POST", body });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/contacts");
  redirect(`/contacts/${saved.id}?saved=1`);
}

export async function setContactActive(form: FormData): Promise<void> {
  await gate();
  const id = assertUuid(str(form, "id"));
  await userApi(`/contacts/${id}`, { method: "PATCH", body: { isActive: form.get("active") === "true" } });
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
}
