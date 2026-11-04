"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/i18n/server";
import { str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Perm } from "@/lib/permissions";

const FIELDS = [
  "tradeName",
  "taxNumber",
  "commercialRegistration",
  "addressStreet",
  "addressBuildingNumber",
  "addressAdditionalNumber",
  "addressDistrict",
  "addressCity",
  "addressPostalCode",
  "addressRegion",
] as const;

export async function saveCompany(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAccess({ permission: Perm.TENANT_MANAGE });
  const { dict } = await getI18n();
  // Only send filled fields: the API keeps the others as they are.
  const body = Object.fromEntries(FIELDS.map((k) => [k, str(form, k) || undefined]).filter(([, v]) => v !== undefined));
  try {
    await userApi("/tenant", { method: "PATCH", body });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/settings");
  return { ok: true, message: dict.companyProfile.saved };
}
