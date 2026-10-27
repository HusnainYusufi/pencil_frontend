"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/i18n/server";
import { DATE_ONLY, assertUuid, isUuid, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";

const periodsGate = () => requireAccess({ feature: Feat.FISCAL_PERIODS, permission: Perm.PERIODS_MANAGE });
const booksGate = () => requireAccess({ permission: Perm.BOOKS_CLOSE });
const PATH = "/settings/periods";

async function reasonOrError(form: FormData): Promise<{ reason: string } | ActionState> {
  const { dict } = await getI18n();
  const reason = str(form, "reason");
  if (reason.length < 10 || reason.length > 500) return { ok: false, fieldErrors: { reason: dict.common.reasonHint } };
  return { reason };
}

export async function closePeriod(_prev: ActionState, form: FormData): Promise<ActionState> {
  await periodsGate();
  try {
    await userApi(`/fiscal-periods/${assertUuid(str(form, "id"))}/close`, { method: "POST" });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function reopenPeriod(_prev: ActionState, form: FormData): Promise<ActionState> {
  await periodsGate();
  const checked = await reasonOrError(form);
  if (!("reason" in checked)) return checked;
  try {
    await userApi(`/fiscal-periods/${assertUuid(str(form, "id"))}/reopen`, { method: "POST", body: { reason: checked.reason } });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function closeYear(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAccess({ feature: Feat.FISCAL_PERIODS, permission: Perm.BOOKS_CLOSE });
  const idempotencyKey = str(form, "idempotencyKey");
  if (!isUuid(idempotencyKey)) return { ok: false, error: (await getI18n()).dict.errors.generic };
  try {
    await userApi(`/fiscal-years/${assertUuid(str(form, "id"))}/close`, { method: "POST", idempotencyKey });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function reopenYear(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAccess({ feature: Feat.FISCAL_PERIODS, permission: Perm.BOOKS_CLOSE });
  const checked = await reasonOrError(form);
  if (!("reason" in checked)) return checked;
  try {
    await userApi(`/fiscal-years/${assertUuid(str(form, "id"))}/reopen`, { method: "POST", body: { reason: checked.reason } });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(PATH);
  return { ok: true };
}

/** Lock dates and the cut-over date. An empty field clears the date. */
export async function saveBooks(_prev: ActionState, form: FormData): Promise<ActionState> {
  await booksGate();
  const { dict } = await getI18n();
  const fieldErrors: Record<string, string> = {};
  const date = (key: string) => {
    const value = str(form, key);
    if (value && !DATE_ONLY.test(value)) fieldErrors[key] = dict.errors.fieldInvalid;
    return value || null;
  };
  const body = {
    lockDate: date("lockDate"),
    taxLockDate: date("taxLockDate"),
    openingBalanceDate: date("openingBalanceDate"),
    reason: str(form, "reason") || undefined,
  };
  if (body.reason && (body.reason.length < 10 || body.reason.length > 500)) fieldErrors.reason = dict.common.reasonHint;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    await userApi("/books", { method: "PATCH", body });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(PATH);
  return { ok: true, message: dict.periods.saved };
}

export async function openNextYear(): Promise<void> {
  await periodsGate();
  await userApi("/fiscal-years", { method: "POST" });
  revalidatePath(PATH);
}
