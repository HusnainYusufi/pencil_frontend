"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { assertUuid, DATE_ONLY, isUuid, optional, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import { PAYMENT_MEANS, type CustomerPayment } from "@/lib/types";

const MONEY = /^\d{1,15}(\.\d{1,4})?$/;
const gate = () => requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.PAYMENTS_MANAGE });

export async function recordPayment(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict } = await getI18n();
  const contactId = str(form, "contactId");
  const accountId = str(form, "accountId");
  const date = str(form, "date");
  const method = str(form, "method");
  const idempotencyKey = str(form, "idempotencyKey");

  let allocations: Array<{ invoiceId: string; amount: string }> = [];
  try {
    allocations = (JSON.parse(str(form, "allocations")) as Array<{ invoiceId: string; amount: string }>)
      .map((a) => ({ invoiceId: String(a.invoiceId), amount: String(a.amount).replace(/,/g, "").trim() }))
      .filter((a) => a.amount && Number(a.amount) !== 0);
  } catch {
    return { ok: false, error: dict.errors.generic };
  }

  const fieldErrors: Record<string, string> = {};
  if (!isUuid(contactId)) fieldErrors.contactId = dict.errors.fieldInvalid;
  if (!isUuid(accountId)) fieldErrors.accountId = dict.errors.fieldInvalid;
  if (!DATE_ONLY.test(date)) fieldErrors.date = dict.errors.fieldInvalid;
  if (!(PAYMENT_MEANS as readonly string[]).includes(method)) fieldErrors.method = dict.errors.fieldInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  if (!isUuid(idempotencyKey) || allocations.length === 0 || allocations.some((a) => !isUuid(a.invoiceId) || !MONEY.test(a.amount))) {
    return { ok: false, error: dict.payments.mustMatch };
  }
  const amount = str(form, "amount");

  let payment: CustomerPayment;
  try {
    payment = await userApi<CustomerPayment>("/customer-payments", {
      method: "POST",
      idempotencyKey,
      body: { contactId, accountId, date, method, amount, reference: optional(form, "reference"), notes: optional(form, "notes"), allocations },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/payments");
  revalidatePath("/invoices");
  redirect(`/payments/${payment.id}?done=recorded`);
}

export async function voidPayment(form: FormData): Promise<void> {
  await gate();
  const id = assertUuid(str(form, "id"));
  await userApi(`/customer-payments/${id}/void`, { method: "POST" });
  revalidatePath("/payments");
  revalidatePath("/invoices");
  redirect(`/payments/${id}?done=voided`);
}
