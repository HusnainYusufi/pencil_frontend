"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/i18n/server";
import { assertUuid, isUuid, optional, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import { SUBTYPES_BY_TYPE } from "@/lib/types";

const ACCOUNT_CODE = /^[0-9A-Za-z][0-9A-Za-z.-]{0,19}$/;
const SUBTYPES = new Set(Object.values(SUBTYPES_BY_TYPE).flat());

export async function createAccount(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAccess({ feature: Feat.CHART_OF_ACCOUNTS, permission: Perm.ACCOUNTS_MANAGE });
  const { dict } = await getI18n();

  const code = str(form, "code");
  const name = str(form, "name");
  const nameAr = optional(form, "nameAr");
  const subtype = str(form, "subtype");
  const parentId = optional(form, "parentId");

  const fieldErrors: Record<string, string> = {};
  if (!ACCOUNT_CODE.test(code)) fieldErrors.code = dict.errors.fieldInvalid;
  if (!name || name.length > 150) fieldErrors.name = dict.errors.fieldInvalid;
  if (nameAr && nameAr.length > 150) fieldErrors.nameAr = dict.errors.fieldInvalid;
  if (!SUBTYPES.has(subtype)) fieldErrors.subtype = dict.errors.fieldInvalid;
  if (parentId && !isUuid(parentId)) fieldErrors.parentId = dict.errors.fieldInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  try {
    await userApi("/accounts", {
      method: "POST",
      body: { code, name, nameAr, subtype, parentId, isGroup: form.get("isGroup") === "on" },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/accounts");
  return { ok: true, message: dict.accounts.created };
}

export async function setAccountActive(form: FormData): Promise<void> {
  await requireAccess({ feature: Feat.CHART_OF_ACCOUNTS, permission: Perm.ACCOUNTS_MANAGE });
  const id = assertUuid(str(form, "id"));
  await userApi(`/accounts/${id}`, { method: "PATCH", body: { isActive: form.get("active") === "true" } });
  revalidatePath("/accounts");
}
