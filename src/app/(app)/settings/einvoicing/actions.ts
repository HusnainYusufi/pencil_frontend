"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/i18n/server";
import { optional, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";

const ENVIRONMENTS = ["SANDBOX", "SIMULATION", "PRODUCTION"];

export async function onboardZatca(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAccess({ feature: Feat.EINVOICING, permission: Perm.EINVOICING_MANAGE });
  const { dict } = await getI18n();
  const environment = str(form, "environment");
  const otp = str(form, "otp");
  const fieldErrors: Record<string, string> = {};
  if (!ENVIRONMENTS.includes(environment)) fieldErrors.environment = dict.errors.fieldInvalid;
  if (!/^\d{6}$/.test(otp)) fieldErrors.otp = dict.errors.fieldInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    await userApi("/einvoicing/units/zatca", {
      method: "POST",
      body: { environment, otp, name: optional(form, "name"), organizationUnit: optional(form, "organizationUnit") },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/settings/einvoicing");
  return { ok: true, message: dict.einvoicing.onboarded };
}
