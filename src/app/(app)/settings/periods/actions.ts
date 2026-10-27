"use server";

import { revalidatePath } from "next/cache";
import { assertUuid, str } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";

const gate = () => requireAccess({ feature: Feat.FISCAL_PERIODS, permission: Perm.PERIODS_MANAGE });

export async function setPeriodStatus(form: FormData): Promise<void> {
  await gate();
  const id = assertUuid(str(form, "id"));
  const action = str(form, "action") === "reopen" ? "reopen" : "close";
  await userApi(`/fiscal-periods/${id}/${action}`, { method: "POST" });
  revalidatePath("/settings/periods");
}

export async function openNextYear(): Promise<void> {
  await gate();
  await userApi("/fiscal-years", { method: "POST" });
  revalidatePath("/settings/periods");
}
