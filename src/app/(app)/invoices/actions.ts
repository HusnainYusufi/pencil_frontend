"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { assertUuid, DATE_ONLY, isUuid, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import { PAYMENT_MEANS, type SalesInvoiceDetail } from "@/lib/types";

interface LineInput {
  description: string;
  quantity: string;
  unitPrice: string;
  discount?: string;
  taxRateId: string;
  accountId?: string;
  costCenterId?: string;
  unitCode?: string;
}

interface InvoiceInput {
  type: "INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";
  kind?: "STANDARD" | "SIMPLIFIED" | "";
  contactId?: string;
  originalInvoiceId?: string;
  reason?: string;
  issueDate: string;
  dueDate?: string;
  supplyDate?: string;
  paymentMeans?: string;
  pricesIncludeTax?: boolean;
  reference?: string;
  notes?: string;
  terms?: string;
  lines: LineInput[];
}

const DECIMAL = /^\d{1,14}(\.\d{1,6})?$/;
const MONEY = /^\d{1,15}(\.\d{1,4})?$/;

function parsePayload(raw: FormDataEntryValue | null): InvoiceInput | null {
  if (typeof raw !== "string" || raw.length > 300_000) return null;
  try {
    const value = JSON.parse(raw) as InvoiceInput;
    return value && typeof value === "object" && Array.isArray(value.lines) ? value : null;
  } catch {
    return null;
  }
}

const clean = (value: string | undefined) => value?.replace(/,/g, "").trim() || undefined;

/** Create or replace a draft, optionally issuing it. Idempotent per form attempt. */
export async function saveInvoice(_prev: ActionState, form: FormData): Promise<ActionState> {
  const issue = str(form, "intent") === "issue";
  await requireAccess({ feature: Feat.SALES_INVOICES, permission: issue ? Perm.INVOICES_ISSUE : Perm.INVOICES_MANAGE });
  const { dict } = await getI18n();
  const input = parsePayload(form.get("payload"));
  const id = str(form, "id");
  const idempotencyKey = str(form, "idempotencyKey");
  if (!input || !isUuid(idempotencyKey) || (id && !isUuid(id))) return { ok: false, error: dict.errors.generic };

  const fieldErrors: Record<string, string> = {};
  if (!DATE_ONLY.test(input.issueDate ?? "")) fieldErrors.issueDate = dict.errors.fieldInvalid;
  for (const key of ["dueDate", "supplyDate"] as const) {
    if (input[key] && !DATE_ONLY.test(input[key])) fieldErrors[key] = dict.errors.fieldInvalid;
  }
  if (input.contactId && !isUuid(input.contactId)) fieldErrors.contactId = dict.errors.fieldInvalid;
  if (input.paymentMeans && !(PAYMENT_MEANS as readonly string[]).includes(input.paymentMeans)) fieldErrors.paymentMeans = dict.errors.fieldInvalid;

  const lines = input.lines.slice(0, 500).map((l) => ({
    description: l.description?.trim().slice(0, 1000) ?? "",
    quantity: clean(l.quantity) ?? "",
    unitPrice: clean(l.unitPrice) ?? "",
    discount: clean(l.discount),
    taxRateId: l.taxRateId,
    accountId: l.accountId || undefined,
    costCenterId: l.costCenterId || undefined,
    unitCode: l.unitCode || undefined,
  }));
  const linesOk =
    lines.length > 0 &&
    lines.every(
      (l) =>
        l.description &&
        DECIMAL.test(l.quantity) &&
        DECIMAL.test(l.unitPrice) &&
        (!l.discount || MONEY.test(l.discount)) &&
        isUuid(l.taxRateId) &&
        (!l.accountId || isUuid(l.accountId)) &&
        (!l.costCenterId || isUuid(l.costCenterId)),
    );
  if (!linesOk) return { ok: false, error: dict.invoices.linesNeeded, fieldErrors };
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const body = {
    kind: input.kind || undefined,
    contactId: input.contactId || undefined,
    originalInvoiceId: input.originalInvoiceId || undefined,
    reason: input.reason?.trim().slice(0, 500) || undefined,
    issueDate: input.issueDate,
    dueDate: input.dueDate || undefined,
    supplyDate: input.supplyDate || undefined,
    paymentMeans: input.paymentMeans || undefined,
    pricesIncludeTax: Boolean(input.pricesIncludeTax),
    reference: input.reference?.trim().slice(0, 100) || undefined,
    notes: input.notes?.trim().slice(0, 2000) || undefined,
    terms: input.terms?.trim().slice(0, 2000) || undefined,
    lines,
  };

  let doc: SalesInvoiceDetail;
  try {
    if (id) {
      await userApi(`/sales-invoices/${id}`, { method: "PATCH", body });
      doc = issue
        ? await userApi<SalesInvoiceDetail>(`/sales-invoices/${id}/issue`, { method: "POST", idempotencyKey })
        : await userApi<SalesInvoiceDetail>(`/sales-invoices/${id}`);
    } else {
      doc = await userApi<SalesInvoiceDetail>("/sales-invoices", {
        method: "POST",
        idempotencyKey,
        body: { ...body, type: input.type, issue },
      });
    }
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/invoices");
  redirect(`/invoices/${doc.id}?done=${doc.status === "ISSUED" ? "issued" : "saved"}`);
}

export async function issueInvoice(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.INVOICES_ISSUE });
  const id = assertUuid(str(form, "id"));
  const idempotencyKey = assertUuid(str(form, "idempotencyKey"));
  try {
    await userApi(`/sales-invoices/${id}/issue`, { method: "POST", idempotencyKey });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/invoices");
  redirect(`/invoices/${id}?done=issued`);
}

export async function voidInvoice(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.INVOICES_ISSUE });
  const { dict } = await getI18n();
  const id = assertUuid(str(form, "id"));
  const reason = str(form, "reason");
  if (reason.length < 3 || reason.length > 500) return { ok: false, fieldErrors: { reason: dict.errors.fieldInvalid } };
  try {
    await userApi(`/sales-invoices/${id}/void`, { method: "POST", body: { reason } });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/invoices");
  redirect(`/invoices/${id}?done=voided`);
}

export async function retryInvoice(form: FormData): Promise<void> {
  await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.INVOICES_ISSUE });
  const id = assertUuid(str(form, "id"));
  await userApi(`/sales-invoices/${id}/einvoice/retry`, { method: "POST" });
  revalidatePath("/invoices");
  redirect(`/invoices/${id}?done=retried`);
}

export async function deleteInvoice(form: FormData): Promise<void> {
  await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.INVOICES_MANAGE });
  const id = assertUuid(str(form, "id"));
  await userApi(`/sales-invoices/${id}`, { method: "DELETE" });
  revalidatePath("/invoices");
  redirect("/invoices?done=deleted");
}
