"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { minorUnits } from "@/i18n/format";
import { assertUuid, DATE_ONLY, isUuid, str, toActionError, type ActionState } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { toMinor } from "@/lib/money";
import { Feat, Perm } from "@/lib/permissions";
import type { JournalDetail } from "@/lib/types";

interface LineInput {
  accountId: string;
  description?: string;
  debit?: string;
  credit?: string;
  costCenterId?: string;
  contactId?: string;
}

interface JournalInput {
  date: string;
  reference?: string;
  memo?: string;
  openingBalance?: boolean;
  lines: LineInput[];
}

const gate = () => requireAccess({ feature: Feat.JOURNALS, permission: Perm.JOURNALS_POST });

function parsePayload(raw: FormDataEntryValue | null): JournalInput | null {
  if (typeof raw !== "string" || raw.length > 200_000) return null;
  try {
    const value = JSON.parse(raw) as JournalInput;
    return value && typeof value === "object" && Array.isArray(value.lines) ? value : null;
  } catch {
    return null;
  }
}

/** Create a draft or post immediately. The idempotency key makes a retried submit safe. */
export async function saveJournal(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ws = await gate();
  const { dict } = await getI18n();
  const input = parsePayload(form.get("payload"));
  const post = str(form, "intent") === "post";
  const idempotencyKey = str(form, "idempotencyKey");
  if (!input || !isUuid(idempotencyKey)) return { ok: false, error: dict.errors.generic };

  const scale = minorUnits(ws.company.baseCurrency);
  const fieldErrors: Record<string, string> = {};
  if (!DATE_ONLY.test(input.date ?? "")) fieldErrors.date = dict.errors.fieldInvalid;
  if ((input.reference ?? "").length > 100) fieldErrors.reference = dict.errors.fieldInvalid;
  if ((input.memo ?? "").length > 1000) fieldErrors.memo = dict.errors.fieldInvalid;

  const lines = input.lines.slice(0, 500).map((line) => ({
    accountId: String(line.accountId ?? ""),
    description: line.description?.trim().slice(0, 500) || undefined,
    debit: line.debit?.replace(/,/g, "").trim() || undefined,
    credit: line.credit?.replace(/,/g, "").trim() || undefined,
    costCenterId: line.costCenterId || undefined,
    contactId: line.contactId || undefined,
  }));
  if (lines.length < 2) return { ok: false, error: dict.journals.linesNeeded, fieldErrors };

  let debits = 0n;
  let credits = 0n;
  for (const line of lines) {
    const debit = line.debit ? toMinor(line.debit, scale) : 0n;
    const credit = line.credit ? toMinor(line.credit, scale) : 0n;
    const bad =
      !isUuid(line.accountId) ||
      (line.costCenterId && !isUuid(line.costCenterId)) ||
      (line.contactId && !isUuid(line.contactId)) ||
      debit === null ||
      credit === null ||
      debit < 0n ||
      credit < 0n;
    if (bad) return { ok: false, error: dict.journals.linesNeeded, fieldErrors };
    if (debit > 0n && credit > 0n) return { ok: false, error: dict.journals.oneSide, fieldErrors };
    if (debit === 0n && credit === 0n) return { ok: false, error: dict.journals.linesNeeded, fieldErrors };
    debits += debit;
    credits += credit;
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  if (post && debits !== credits) return { ok: false, error: dict.errors.UNBALANCED_ENTRY };

  let entry: JournalDetail;
  try {
    entry = await userApi<JournalDetail>("/journal-entries", {
      method: "POST",
      idempotencyKey,
      body: {
        date: input.date,
        reference: input.reference?.trim() || undefined,
        memo: input.memo?.trim() || undefined,
        source: input.openingBalance ? "OPENING_BALANCE" : "MANUAL",
        post,
        lines,
      },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/journals");
  redirect(`/journals/${entry.id}?done=${post ? "posted" : "saved"}`);
}

export async function postJournal(form: FormData): Promise<void> {
  await gate();
  const id = assertUuid(str(form, "id"));
  const idempotencyKey = assertUuid(str(form, "idempotencyKey"));
  await userApi(`/journal-entries/${id}/post`, { method: "POST", idempotencyKey });
  revalidatePath("/journals");
  redirect(`/journals/${id}?done=posted`);
}

export async function reverseJournal(_prev: ActionState, form: FormData): Promise<ActionState> {
  await gate();
  const { dict } = await getI18n();
  const id = assertUuid(str(form, "id"));
  const idempotencyKey = str(form, "idempotencyKey");
  const date = str(form, "date");
  const memo = str(form, "memo");
  if (!isUuid(idempotencyKey)) return { ok: false, error: dict.errors.generic };
  if (date && !DATE_ONLY.test(date)) return { ok: false, fieldErrors: { date: dict.errors.fieldInvalid } };

  let reversal: JournalDetail;
  try {
    reversal = await userApi<JournalDetail>(`/journal-entries/${id}/reverse`, {
      method: "POST",
      idempotencyKey,
      body: { date: date || undefined, memo: memo.slice(0, 1000) || undefined },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/journals");
  redirect(`/journals/${reversal.id}?done=reversed`);
}

export async function deleteJournal(form: FormData): Promise<void> {
  await gate();
  const id = assertUuid(str(form, "id"));
  await userApi(`/journal-entries/${id}`, { method: "DELETE" });
  revalidatePath("/journals");
  redirect("/journals?done=deleted");
}
