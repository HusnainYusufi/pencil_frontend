"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/i18n/server";
import { str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Perm } from "@/lib/permissions";

const FIELDS = ["taxNumber", "commercialRegistration", "buildingNumber", "street", "district", "city", "postalCode", "additionalNumber", "activityNumber"] as const;

/** Seller tax details. An emptied field is cleared (sent as null). */
export async function saveTaxProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAccess({ permission: Perm.TAXES_MANAGE });
  const { dict } = await getI18n();
  const body: Record<string, unknown> = {
    registration: str(form, "registration") || undefined,
    filingFrequency: str(form, "filingFrequency") || undefined,
  };
  for (const field of FIELDS) body[field] = str(form, field) || null;
  try {
    await userApi("/tax-profile", { method: "PATCH", body });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/settings/company");
  return { ok: true, message: dict.companyTax.saved };
}
