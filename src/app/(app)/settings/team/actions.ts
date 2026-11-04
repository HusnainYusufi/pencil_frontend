"use server";

import { revalidatePath } from "next/cache";
import { getI18n } from "@/i18n/server";
import { assertUuid, isUuid, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Perm } from "@/lib/permissions";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const gate = () => requireAccess({ permission: Perm.MEMBERS_MANAGE });

export async function inviteMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict, t } = await getI18n();
  const email = str(form, "email");
  const fullName = str(form, "fullName");
  const roleId = str(form, "roleId");
  const fieldErrors: Record<string, string> = {};
  if (!EMAIL.test(email) || email.length > 254) fieldErrors.email = dict.errors.fieldInvalid;
  if (fullName.length < 2 || fullName.length > 150) fieldErrors.fullName = dict.errors.fieldInvalid;
  if (!isUuid(roleId)) fieldErrors.roleId = dict.errors.fieldInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  let result: { emailSent: boolean };
  try {
    result = await userApi<{ emailSent: boolean }>("/members/invite", { method: "POST", body: { email, fullName, roleId } });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/settings/team");
  return { ok: true, message: result.emailSent ? t(dict.team.invited, { email }) : dict.team.inviteNotSent };
}

export async function resendInvitation(form: FormData): Promise<void> {
  await gate();
  await userApi(`/members/${assertUuid(str(form, "id"))}/resend-invitation`, { method: "POST" });
  revalidatePath("/settings/team");
}

export async function revokeInvitation(form: FormData): Promise<void> {
  await gate();
  await userApi(`/members/${assertUuid(str(form, "id"))}`, { method: "DELETE" });
  revalidatePath("/settings/team");
}

export async function changeRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict } = await getI18n();
  const id = assertUuid(str(form, "id"));
  const roleId = str(form, "roleId");
  if (!isUuid(roleId)) return { ok: false, error: dict.errors.fieldInvalid };
  try {
    await userApi(`/members/${id}/role`, { method: "PATCH", body: { roleId } });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/settings/team");
  return { ok: true, message: dict.team.roleChanged };
}
