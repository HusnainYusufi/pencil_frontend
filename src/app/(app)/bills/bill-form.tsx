"use client";

import { Plus, X } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/interactive";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { formatAmount, minorUnits } from "@/i18n/format";
import { fromMinor } from "@/lib/money";
import type { PurchaseDetail, PurchaseDocumentType } from "@/lib/types";
import { estimate, type Option, type TaxOption } from "../invoices/invoice-form";
import { saveBill } from "./actions";

interface Line {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRateId: string;
  accountId: string;
  costCenterId: string;
}

let seq = 0;
const DECIMAL_INPUT = /^[\d,]*\.?\d*$/;

export function BillForm({
  type,
  suppliers,
  taxRates,
  accounts,
  payingAccounts,
  costCenters,
  currency,
  today,
  defaultContactId,
  original,
  draft,
}: {
  type: PurchaseDocumentType;
  suppliers: Option[];
  taxRates: TaxOption[];
  /** Expense / asset accounts for lines. */
  accounts: Option[];
  /** Cash and bank accounts (expenses). */
  payingAccounts: Option[];
  costCenters: Option[];
  currency: string;
  today: string;
  defaultContactId?: string;
  original?: { id: string; number: string; contactId: string | null };
  draft?: PurchaseDetail;
}) {
  const { dict } = useI18n();
  const p = dict.purchases;
  const iv = dict.invoices;
  const scale = minorUnits(currency);
  const defaultRate = taxRates.find((r) => r.isDefault)?.id ?? taxRates[0]?.id ?? "";
  const newLine = (): Line => ({ key: ++seq, description: "", quantity: "1", unitPrice: "", discount: "", taxRateId: defaultRate, accountId: "", costCenterId: "" });
  const [state, dispatch, pending] = useActionState(saveBill, {});
  const [intent, setIntent] = useState<"draft" | "post">("post");
  const [inclusive, setInclusive] = useState(draft?.pricesIncludeTax ?? type === "EXPENSE");
  const [lines, setLines] = useState<Line[]>(() =>
    draft
      ? draft.lines.map((l) => ({
          key: ++seq,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: /[1-9]/.test(l.discount) ? l.discount : "",
          taxRateId: l.taxRate.id,
          accountId: l.account.id,
          costCenterId: l.costCenter?.id ?? "",
        }))
      : [newLine()],
  );
  const key = useRef("");
  useEffect(() => {
    key.current = crypto.randomUUID();
  }, [state]);

  const totals = estimate(lines, new Map(taxRates.map((r) => [r.id, r.rate])), scale, inclusive);
  const money = (m: bigint) => formatAmount(fromMinor(m, scale), currency);
  const update = (k: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const chosen = submitter?.value === "draft" ? "draft" : "post";
    setIntent(chosen);
    const f = new FormData(event.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    const payload = {
      type,
      contactId: original ? (original.contactId ?? "") : get("contactId"),
      supplierReference: get("supplierReference"),
      billDate: get("billDate"),
      dueDate: get("dueDate"),
      paidFromAccountId: get("paidFromAccountId"),
      originalBillId: original?.id,
      reason: get("reason"),
      notes: get("notes"),
      pricesIncludeTax: inclusive,
      lines: lines
        .filter((l) => l.description || l.unitPrice)
        .map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount, taxRateId: l.taxRateId, accountId: l.accountId, costCenterId: l.costCenterId })),
    };
    const data = new FormData();
    data.set("payload", JSON.stringify(payload));
    data.set("intent", chosen);
    data.set("idempotencyKey", key.current);
    if (draft) data.set("id", draft.id);
    startTransition(() => dispatch(data));
  };

  const decimal = (line: Line, field: "quantity" | "unitPrice" | "discount", label: string, width: string) => (
    <Input
      value={line[field]}
      inputMode="decimal"
      dir="ltr"
      autoComplete="off"
      aria-label={label}
      className={`h-9 ${width} text-end font-mono text-[13px] tabular`}
      onChange={(e) => DECIMAL_INPUT.test(e.target.value) && update(line.key, { [field]: e.target.value })}
    />
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        {original ? (
          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-[13px] font-medium">{p.originalBill}</p>
            <p className="num font-mono text-[14px]">{original.number}</p>
          </div>
        ) : (
          <Field label={p.supplier} htmlFor="contactId" error={state.fieldErrors?.contactId}>
            <Select id="contactId" name="contactId" defaultValue={draft?.contact?.id ?? defaultContactId ?? ""}>
              <option value="">{type === "EXPENSE" ? p.noSupplier : p.selectSupplier}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={p.supplierReference} htmlFor="supplierReference" optional={dict.common.optional}>
          <Input id="supplierReference" name="supplierReference" maxLength={100} dir="ltr" defaultValue={draft?.supplierReference ?? ""} />
        </Field>
        <Field label={p.billDate} htmlFor="billDate" error={state.fieldErrors?.billDate}>
          <Input id="billDate" name="billDate" type="date" defaultValue={draft?.billDate ?? today} required />
        </Field>
        {type === "BILL" && (
          <Field label={p.dueDate} htmlFor="dueDate" optional={dict.common.optional} error={state.fieldErrors?.dueDate}>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={draft?.dueDate ?? ""} />
          </Field>
        )}
        {type === "EXPENSE" && (
          <Field label={p.paidFrom} htmlFor="paidFromAccountId" error={state.fieldErrors?.paidFromAccountId}>
            <Select id="paidFromAccountId" name="paidFromAccountId" defaultValue={draft?.paidFrom?.id ?? payingAccounts[0]?.id ?? ""}>
              {payingAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {type === "CREDIT_NOTE" && (
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label={p.reason} htmlFor="reason">
              <Input id="reason" name="reason" maxLength={500} dir="auto" defaultValue={draft?.reason ?? ""} />
            </Field>
          </div>
        )}
        <label className="flex items-center gap-2.5 text-[13px] text-ink-2 sm:col-span-2 lg:col-span-4">
          <input type="checkbox" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} className="size-4 accent-ink" />
          {iv.pricesIncludeTax}
        </label>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                {["#", iv.description, p.account, iv.quantity, iv.unitPrice, iv.discount, iv.taxRate, ...(costCenters.length ? [dict.journals.costCenter] : []), iv.lineTotal, ""].map((label, i) => (
                  <th key={i} className="border-b border-line bg-surface-2/60 px-2 py-2.5 text-start font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.key} className="group">
                  <td className="border-b border-line px-3 py-1.5 font-mono text-[12px] text-muted">{index + 1}</td>
                  <td className="min-w-[13rem] border-b border-line px-2 py-1.5">
                    <Input value={line.description} onChange={(e) => update(line.key, { description: e.target.value })} maxLength={1000} dir="auto" aria-label={iv.description} className="h-9 text-[13px]" />
                  </td>
                  <td className="min-w-[13rem] border-b border-line px-2 py-1.5">
                    <Select value={line.accountId} onChange={(e) => update(line.key, { accountId: e.target.value })} aria-label={p.account} className="h-9 text-[13px]">
                      <option value="">{p.selectAccount}</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="border-b border-line px-2 py-1.5">{decimal(line, "quantity", iv.quantity, "w-20")}</td>
                  <td className="border-b border-line px-2 py-1.5">{decimal(line, "unitPrice", iv.unitPrice, "w-28")}</td>
                  <td className="border-b border-line px-2 py-1.5">{decimal(line, "discount", iv.discount, "w-24")}</td>
                  <td className="min-w-[9rem] border-b border-line px-2 py-1.5">
                    <Select value={line.taxRateId} onChange={(e) => update(line.key, { taxRateId: e.target.value })} aria-label={iv.taxRate} className="h-9 text-[13px]">
                      {taxRates.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  {costCenters.length > 0 && (
                    <td className="min-w-[9rem] border-b border-line px-2 py-1.5">
                      <Select value={line.costCenterId} onChange={(e) => update(line.key, { costCenterId: e.target.value })} aria-label={dict.journals.costCenter} className="h-9 text-[13px]">
                        <option value="">—</option>
                        {costCenters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  )}
                  <td className="border-b border-line px-3 py-1.5 text-end font-mono text-[13px] tabular">
                    <span className="num">{money(totals.rows[index]?.total ?? 0n)}</span>
                  </td>
                  <td className="border-b border-line px-1 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== line.key) : ls))}
                      disabled={lines.length <= 1}
                      aria-label={`${iv.removeLine} ${index + 1}`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted opacity-0 hover:bg-surface-2 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:invisible"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-4 bg-surface-2/40 p-4 sm:flex-row sm:items-start sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => setLines((ls) => [...ls, newLine()])}>
            <Plus className="size-4" aria-hidden />
            {iv.addLine}
          </Button>
          <dl className="grid min-w-64 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-[13px]">
            <dt className="text-muted">{iv.taxable}</dt>
            <dd className="num text-end font-mono tabular">{money(totals.net)}</dd>
            <dt className="text-muted">{iv.tax}</dt>
            <dd className="num text-end font-mono tabular">{money(totals.tax)}</dd>
            <dt className="font-semibold">{iv.total}</dt>
            <dd className="num text-end font-mono font-semibold tabular">
              {money(totals.total)} <span className="text-[0.8em] font-normal text-muted">{currency}</span>
            </dd>
          </dl>
        </div>
      </section>

      <Field label={iv.notes} htmlFor="notes" optional={dict.common.optional}>
        <Textarea id="notes" name="notes" maxLength={2000} dir="auto" defaultValue={draft?.notes ?? ""} />
      </Field>

      <div className="flex justify-end gap-2">
        <SubmitButton variant="secondary" pending={pending && intent === "draft"} value="draft">
          {p.saveDraft}
        </SubmitButton>
        <SubmitButton pending={pending && intent === "post"} disabled={pending || totals.invalid || totals.total <= 0n} value="post">
          {p.saveAndPost}
        </SubmitButton>
      </div>
    </form>
  );
}
