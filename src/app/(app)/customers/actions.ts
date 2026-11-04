"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { assertUuid, isUuid, optional, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import { ID_SCHEMES, type Contact } from "@/lib/types";

const gate = () => requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.CONTACTS_MANAGE });

const ADDRESS_FIELDS = [
  "addressStreet",
  "addressBuildingNumber",
  "addressAdditionalNumber",
  "addressDistrict",
  "addressCity",
  "addressPostalCode",
  "addressRegion",
] as const;

/** Create (no id) or update a customer. Empty optional fields clear on update. */
export async function saveCustomer(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict } = await getI18n();
  const id = optional(form, "id");
  const editing = Boolean(id);
  if (id && !isUuid(id)) return { ok: false, error: dict.errors.generic };

  const name = str(form, "name");
  const type = str(form, "type") === "INDIVIDUAL" ? "INDIVIDUAL" : "BUSINESS";
  const idScheme = optional(form, "idScheme");
  const terms = optional(form, "paymentTermsDays");
  const country = optional(form, "addressCountry")?.toUpperCase();

  const fieldErrors: Record<string, string> = {};
  if (!name || name.length > 200) fieldErrors.name = dict.errors.fieldInvalid;
  if (idScheme && !(ID_SCHEMES as readonly string[]).includes(idScheme)) fieldErrors.idScheme = dict.errors.fieldInvalid;
  if (terms && !/^\d{1,3}$/.test(terms)) fieldErrors.paymentTermsDays = dict.errors.fieldInvalid;
  if (country && !/^[A-Z]{2}$/.test(country)) fieldErrors.addressCountry = dict.errors.fieldInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  // On update an emptied field is cleared (null); on create it is simply omitted.
  const value = (key: string) => (editing ? str(form, key) || null : optional(form, key));
  const body: Record<string, unknown> = {
    type,
    name,
    nameAr: value("nameAr"),
    code: value("code"),
    email: value("email"),
    phone: value("phone"),
    taxNumber: value("taxNumber"),
    idScheme: idScheme ?? (editing ? null : undefined),
    idNumber: value("idNumber"),
    addressCountry: country ?? (editing ? null : undefined),
    paymentTermsDays: terms ? Number(terms) : editing ? null : undefined,
    notes: value("notes"),
  };
  for (const key of ADDRESS_FIELDS) body[key] = value(key);

  let contact: Contact;
  try {
    contact = await userApi<Contact>(editing ? `/contacts/${id}` : "/contacts", { method: editing ? "PATCH" : "POST", body });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/customers");
  const next = str(form, "next");
  if (!editing && next === "invoice") redirect(`/invoices/new?contact=${contact.id}`);
  redirect(`/customers/${contact.id}?done=saved`);
}

export async function setCustomerActive(form: FormData): Promise<void> {
  await gate();
  const id = assertUuid(str(form, "id"));
  await userApi(`/contacts/${id}`, { method: "PATCH", body: { isActive: form.get("active") === "true" } });
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}
