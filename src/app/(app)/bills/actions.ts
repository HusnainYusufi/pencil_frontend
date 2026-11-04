"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { assertUuid, DATE_ONLY, isUuid, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import type { PurchaseDetail, SupplierPayment } from "@/lib/types";

const DECIMAL = /^\d{1,14}(\.\d{1,6})?$/;
const MONEY = /^\d{1,15}(\.\d{1,4})?$/;
const gate = () => requireAccess({ feature: Feat.BILLS, permission: Perm.BILLS_MANAGE });
const clean = (v: string | undefined) => v?.replace(/,/g, "").trim() || undefined;

interface BillInput {
  type: "BILL" | "CREDIT_NOTE" | "EXPENSE";
  contactId?: string;
  supplierReference?: string;
  billDate: string;
  dueDate?: string;
  paidFromAccountId?: string;
  originalBillId?: string;
  reason?: string;
  notes?: string;
  pricesIncludeTax?: boolean;
  lines: Array<{ description: string; quantity: string; unitPrice: string; discount?: string; taxRateId: string; accountId: string; costCenterId?: string }>;
}

export async function saveBill(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict } = await getI18n();
  const post = str(form, "intent") === "post";
  const id = str(form, "id");
  const idempotencyKey = str(form, "idempotencyKey");
  let input: BillInput;
  try {
    input = JSON.parse(str(form, "payload")) as BillInput;
  } catch {
    return { ok: false, error: dict.errors.generic };
  }
  if (!isUuid(idempotencyKey) || (id && !isUuid(id)) || !Array.isArray(input.lines)) return { ok: false, error: dict.errors.generic };
  const fieldErrors: Record<string, string> = {};
  if (!DATE_ONLY.test(input.billDate ?? "")) fieldErrors.billDate = dict.errors.fieldInvalid;
  if (input.dueDate && !DATE_ONLY.test(input.dueDate)) fieldErrors.dueDate = dict.errors.fieldInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const lines = input.lines.slice(0, 500).map((l) => ({
    description: l.description?.trim().slice(0, 1000) ?? "",
    quantity: clean(l.quantity) ?? "",
    unitPrice: clean(l.unitPrice) ?? "",
    discount: clean(l.discount),
    taxRateId: l.taxRateId,
    accountId: l.accountId,
    costCenterId: l.costCenterId || undefined,
  }));
  const ok =
    lines.length > 0 &&
    lines.every((l) => l.description && DECIMAL.test(l.quantity) && DECIMAL.test(l.unitPrice) && (!l.discount || MONEY.test(l.discount)) && isUuid(l.taxRateId) && isUuid(l.accountId));
  if (!ok) return { ok: false, error: dict.purchases.linesNeeded };

  const body = {
    contactId: input.contactId || undefined,
    supplierReference: input.supplierReference?.trim().slice(0, 100) || undefined,
    billDate: input.billDate,
    dueDate: input.dueDate || undefined,
    paidFromAccountId: input.paidFromAccountId || undefined,
    originalBillId: input.originalBillId || undefined,
    reason: input.reason?.trim().slice(0, 500) || undefined,
    notes: input.notes?.trim().slice(0, 2000) || undefined,
    pricesIncludeTax: Boolean(input.pricesIncludeTax),
    lines,
  };
  let doc: PurchaseDetail;
  try {
    if (id) {
      await userApi(`/purchase-bills/${id}`, { method: "PATCH", body });
      doc = post
        ? await userApi<PurchaseDetail>(`/purchase-bills/${id}/post`, { method: "POST", idempotencyKey })
        : await userApi<PurchaseDetail>(`/purchase-bills/${id}`);
    } else {
      doc = await userApi<PurchaseDetail>("/purchase-bills", { method: "POST", idempotencyKey, body: { ...body, type: input.type, post } });
    }
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/bills");
  revalidatePath("/expenses");
  redirect(`/bills/${doc.id}?done=${doc.status === "POSTED" ? "posted" : "saved"}`);
}

export async function postBill(form: FormData): Promise<void> {
  await gate();
  const id = assertUuid(str(form, "id"));
  await userApi(`/purchase-bills/${id}/post`, { method: "POST", idempotencyKey: assertUuid(str(form, "idempotencyKey")) });
  revalidatePath("/bills");
  redirect(`/bills/${id}?done=posted`);
}

export async function voidBill(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict } = await getI18n();
  const id = assertUuid(str(form, "id"));
  const reason = str(form, "reason");
  if (reason.length < 3) return { ok: false, fieldErrors: { reason: dict.errors.fieldInvalid } };
  try {
    await userApi(`/purchase-bills/${id}/void`, { method: "POST", body: { reason } });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/bills");
  redirect(`/bills/${id}?done=voided`);
}

export async function deleteBill(form: FormData): Promise<void> {
  await gate();
  await userApi(`/purchase-bills/${assertUuid(str(form, "id"))}`, { method: "DELETE" });
  revalidatePath("/bills");
  redirect("/bills?done=deleted");
}

export async function paySupplier(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict } = await getI18n();
  let allocations: Array<{ billId: string; amount: string }>;
  try {
    allocations = (JSON.parse(str(form, "allocations")) as Array<{ billId: string; amount: string }>)
      .map((a) => ({ billId: String(a.billId), amount: String(a.amount).replace(/,/g, "").trim() }))
      .filter((a) => a.amount && /[1-9]/.test(a.amount));
  } catch {
    return { ok: false, error: dict.errors.generic };
  }
  const contactId = str(form, "contactId");
  const accountId = str(form, "accountId");
  const date = str(form, "date");
  if (!isUuid(contactId) || !isUuid(accountId) || !DATE_ONLY.test(date) || allocations.length === 0 || allocations.some((a) => !isUuid(a.billId) || !MONEY.test(a.amount))) {
    return { ok: false, error: dict.payments.mustMatch };
  }
  let payment: SupplierPayment;
  try {
    payment = await userApi<SupplierPayment>("/supplier-payments", {
      method: "POST",
      idempotencyKey: assertUuid(str(form, "idempotencyKey")),
      body: { contactId, accountId, date, amount: str(form, "amount"), method: str(form, "method") || undefined, reference: str(form, "reference") || undefined, allocations },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/bills");
  revalidatePath("/supplier-payments");
  redirect(`/supplier-payments/${payment.id}?done=recorded`);
}

export async function voidSupplierPayment(form: FormData): Promise<void> {
  await gate();
  const id = assertUuid(str(form, "id"));
  await userApi(`/supplier-payments/${id}/void`, { method: "POST" });
  revalidatePath("/supplier-payments");
  revalidatePath("/bills");
  redirect(`/supplier-payments/${id}?done=voided`);
}
