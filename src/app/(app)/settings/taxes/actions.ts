"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/i18n/server";
import { DATE_ONLY, assertUuid, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";

const gate = () => requireAccess({ feature: Feat.TAX_CODES, permission: Perm.TAXES_MANAGE });
const PERCENT = /^\d{1,3}(\.\d{1,4})?$/;
const PATH = "/settings/taxes";

export async function createTaxCode(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict } = await getI18n();
  const kind = str(form, "kind");
  const rate = str(form, "ratePercent");
  const from = str(form, "effectiveFrom");
  const fieldErrors: Record<string, string> = {};
  if (!PERCENT.test(rate)) fieldErrors.ratePercent = dict.errors.fieldInvalid;
  if (!DATE_ONLY.test(from)) fieldErrors.effectiveFrom = dict.errors.fieldInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    await userApi("/tax-codes", {
      method: "POST",
      body: {
        code: str(form, "code"),
        name: str(form, "name"),
        nameAr: str(form, "nameAr"),
        kind,
        treatment: str(form, "treatment"),
        taxAccountId: str(form, "taxAccountId") || undefined,
        recoverable: kind === "PURCHASE" ? form.get("recoverable") === "on" : undefined,
        rate: { ratePercent: rate, effectiveFrom: from },
      },
    });
  } catch (error) {
    const state = await toActionError(error);
    // The API reports the nested rate as rate.ratePercent / rate.effectiveFrom.
    for (const [key, message] of Object.entries(state.fieldErrors ?? {})) {
      if (key.startsWith("rate.")) state.fieldErrors![key.slice(5)] = message;
    }
    return state;
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function addTaxRate(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict } = await getI18n();
  const rate = str(form, "ratePercent");
  const from = str(form, "effectiveFrom");
  if (!PERCENT.test(rate)) return { ok: false, fieldErrors: { ratePercent: dict.errors.fieldInvalid } };
  try {
    await userApi(`/tax-codes/${assertUuid(str(form, "id"))}/rates`, { method: "POST", body: { ratePercent: rate, effectiveFrom: from } });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function setTaxCodeActive(form: FormData): Promise<void> {
  await gate();
  await userApi(`/tax-codes/${assertUuid(str(form, "id"))}`, { method: "PATCH", body: { isActive: form.get("active") === "true" } });
  revalidatePath(PATH);
}
