"use client";

import { Plus, X } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/interactive";
import { Button, cn, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { formatAmount, minorUnits } from "@/i18n/format";
import { fromMinor, toMinor } from "@/lib/money";
import { PAYMENT_MEANS, type SalesDocumentType, type SalesInvoiceDetail } from "@/lib/types";
import { saveInvoice } from "./actions";

export interface Option {
  id: string;
  label: string;
}
export interface TaxOption extends Option {
  /** Percentage, e.g. "15.00". */
  rate: string;
  isDefault: boolean;
}
export interface CustomerOption extends Option {
  type: "BUSINESS" | "INDIVIDUAL";
}

export interface EstimateLine {
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRateId: string;
}

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
const pow10 = (n: number) => 10n ** BigInt(n);
/** a / b rounded half-up (non-negative). */
const divRound = (a: bigint, b: bigint) => (a * 2n + b) / (2n * b);

/**
 * Estimated line amounts in minor units, mirroring the API's rules (net per
 * line, tax per rate on the summed net). The API's figures are authoritative.
 */
export function estimate(lines: EstimateLine[], rates: Map<string, string>, scale: number, inclusive: boolean) {
  const byRate = new Map<string, { rate: bigint; net: bigint }>();
  let invalid = false;
  const rows = lines.map((line) => {
    const q = toMinor(line.quantity || "0", 6);
    const p = toMinor(line.unitPrice || "0", 6);
    const d = toMinor(line.discount || "0", scale);
    const r = toMinor(rates.get(line.taxRateId) ?? "0", 4) ?? 0n;
    if (q === null || p === null || d === null) {
      invalid = true;
      return { net: 0n, total: 0n };
    }
    const gross = divRound(q * p, pow10(12 - scale));
    const after = gross > d ? gross - d : 0n;
    // r is the percentage at 4 decimals, i.e. the rate as a fraction x 10^6.
    const net = inclusive ? divRound(after * pow10(6), pow10(6) + r) : after;
    const tax = inclusive ? after - net : divRound(net * r, pow10(6));
    const key = line.taxRateId || "-";
    const group = byRate.get(key) ?? { rate: r, net: 0n };
    group.net += net;
    byRate.set(key, group);
    return { net, total: net + tax };
  });
  const net = [...byRate.values()].reduce((s, g) => s + g.net, 0n);
  const tax = [...byRate.values()].reduce((s, g) => s + divRound(g.net * g.rate, pow10(6)), 0n);
  return { rows, net, tax, total: net + tax, invalid };
}

export function InvoiceForm({
  type,
  customers,
  taxRates,
  accounts,
  costCenters,
  currency,
  today,
  defaultContactId,
  original,
  draft,
}: {
  type: SalesDocumentType;
  customers: CustomerOption[];
  taxRates: TaxOption[];
  accounts: Option[];
  costCenters: Option[];
  currency: string;
  today: string;
  defaultContactId?: string;
  /** Credit / debit notes: the invoice being adjusted (customer and kind are fixed). */
  original?: { id: string; number: string; contactId: string | null; kind: "STANDARD" | "SIMPLIFIED" };
  /** Editing an existing draft. */
  draft?: SalesInvoiceDetail;
}) {
  const { dict, t } = useI18n();
  const iv = dict.invoices;
  const scale = minorUnits(currency);
  const defaultRate = taxRates.find((r) => r.isDefault)?.id ?? taxRates[0]?.id ?? "";
  const newLine = (): Line => ({ key: ++seq, description: "", quantity: "1", unitPrice: "", discount: "", taxRateId: defaultRate, accountId: "", costCenterId: "" });

  const [state, dispatch, pending] = useActionState(saveInvoice, {});
  const [intent, setIntent] = useState<"draft" | "issue">("issue");
  const [inclusive, setInclusive] = useState(draft?.pricesIncludeTax ?? false);
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
  const idempotencyKey = useRef("");
  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID();
  }, [state]);

  const rates = new Map(taxRates.map((r) => [r.id, r.rate]));
  const totals = estimate(lines, rates, scale, inclusive);
  const money = (minor: bigint) => formatAmount(fromMinor(minor, scale), currency);
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const isNote = type !== "INVOICE";

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const chosen = submitter?.value === "draft" ? "draft" : "issue";
    setIntent(chosen);
    const f = new FormData(event.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    const payload = {
      type,
      kind: original?.kind ?? get("kind"),
      contactId: original ? (original.contactId ?? "") : get("contactId"),
      originalInvoiceId: original?.id,
      reason: get("reason"),
      issueDate: get("issueDate"),
      dueDate: get("dueDate"),
      supplyDate: get("supplyDate"),
      paymentMeans: get("paymentMeans"),
      pricesIncludeTax: inclusive,
      reference: get("reference"),
      notes: get("notes"),
      terms: get("terms"),
      lines: lines
        .filter((l) => l.description || l.unitPrice)
        .map(({ description, quantity, unitPrice, discount, taxRateId, accountId, costCenterId }) => ({
          description,
          quantity,
          unitPrice,
          discount,
          taxRateId,
          accountId,
          costCenterId,
        })),
    };
    const data = new FormData();
    data.set("payload", JSON.stringify(payload));
    data.set("intent", chosen);
    data.set("idempotencyKey", idempotencyKey.current);
    if (draft) data.set("id", draft.id);
    startTransition(() => dispatch(data));
  };

  const decimalProps = (line: Line, field: "quantity" | "unitPrice" | "discount", label: string) => ({
    value: line[field],
    inputMode: "decimal" as const,
    dir: "ltr" as const,
    autoComplete: "off",
    "aria-label": label,
    className: "h-9 w-28 text-end font-mono text-[13px] tabular",
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      if (DECIMAL_INPUT.test(e.target.value)) update(line.key, { [field]: e.target.value });
    },
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormMessage tone="danger">
        {state.error}
        {state.details && (
          <ul className="mt-2 list-disc space-y-0.5 ps-5 font-mono text-[12px]" dir="ltr">
            {state.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </FormMessage>

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        {original ? (
          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-[13px] font-medium">{iv.originalInvoice}</p>
            <p className="num font-mono text-[14px]">{original.number}</p>
          </div>
        ) : (
          <>
            <Field label={iv.customer} htmlFor="contactId" error={state.fieldErrors?.contactId}>
              <Select id="contactId" name="contactId" defaultValue={draft?.contact?.id ?? defaultContactId ?? ""}>
                <option value="">{iv.walkIn}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={iv.kind} htmlFor="kind" error={state.fieldErrors?.kind}>
              <Select id="kind" name="kind" defaultValue={draft?.kind ?? ""}>
                <option value="">{iv.autoKind}</option>
                <option value="STANDARD">{iv.kinds.STANDARD}</option>
                <option value="SIMPLIFIED">{iv.kinds.SIMPLIFIED}</option>
              </Select>
            </Field>
          </>
        )}
        <Field label={iv.issueDate} htmlFor="issueDate" error={state.fieldErrors?.issueDate}>
          <Input id="issueDate" name="issueDate" type="date" defaultValue={draft?.issueDate ?? today} required />
        </Field>
        <Field label={iv.supplyDate} htmlFor="supplyDate" optional={dict.common.optional} error={state.fieldErrors?.supplyDate}>
          <Input id="supplyDate" name="supplyDate" type="date" defaultValue={draft?.supplyDate ?? ""} />
        </Field>
        {!isNote && (
          <Field label={iv.dueDate} htmlFor="dueDate" optional={dict.common.optional} error={state.fieldErrors?.dueDate}>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={draft?.dueDate ?? ""} />
          </Field>
        )}
        <Field label={iv.paymentMeansLabel} htmlFor="paymentMeans">
          <Select id="paymentMeans" name="paymentMeans" defaultValue={draft?.paymentMeans ?? "CREDIT"}>
            {PAYMENT_MEANS.map((m) => (
              <option key={m} value={m}>
                {iv.paymentMeans[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={iv.reference} htmlFor="reference" optional={dict.common.optional}>
          <Input id="reference" name="reference" maxLength={100} dir="auto" defaultValue={draft?.reference ?? ""} />
        </Field>
        {isNote && (
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label={iv.reason} htmlFor="reason" error={state.fieldErrors?.reason}>
              <Input id="reason" name="reason" maxLength={500} dir="auto" required defaultValue={draft?.reason ?? ""} />
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
          <table className="w-full border-collapse text-start text-[13.5px]">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                {["#", iv.description, iv.quantity, iv.unitPrice, iv.discount, iv.taxRate, iv.account, ...(costCenters.length ? [dict.journals.costCenter] : []), iv.lineTotal, ""].map(
                  (label, i) => (
                    <th key={i} scope="col" className={cn("border-b border-line bg-surface-2/60 px-2 py-2.5 font-medium", i >= 2 && i <= 4 ? "text-end" : "text-start")}>
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.key} className="group">
                  <td className="border-b border-line px-3 py-1.5 font-mono text-[12px] text-muted">{index + 1}</td>
                  <td className="min-w-[14rem] border-b border-line px-2 py-1.5">
                    <Input value={line.description} onChange={(e) => update(line.key, { description: e.target.value })} maxLength={1000} dir="auto" aria-label={iv.description} className="h-9 text-[13px]" />
                  </td>
                  <td className="border-b border-line px-2 py-1.5">
                    <Input {...decimalProps(line, "quantity", iv.quantity)} className="h-9 w-20 text-end font-mono text-[13px] tabular" />
                  </td>
                  <td className="border-b border-line px-2 py-1.5">
                    <Input {...decimalProps(line, "unitPrice", iv.unitPrice)} placeholder={fromMinor(0n, scale)} />
                  </td>
                  <td className="border-b border-line px-2 py-1.5">
                    <Input {...decimalProps(line, "discount", iv.discount)} className="h-9 w-24 text-end font-mono text-[13px] tabular" />
                  </td>
                  <td className="min-w-[10rem] border-b border-line px-2 py-1.5">
                    <Select value={line.taxRateId} onChange={(e) => update(line.key, { taxRateId: e.target.value })} aria-label={iv.taxRate} className="h-9 text-[13px]">
                      {taxRates.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="min-w-[12rem] border-b border-line px-2 py-1.5">
                    <Select value={line.accountId} onChange={(e) => update(line.key, { accountId: e.target.value })} aria-label={iv.account} className="h-9 text-[13px]">
                      <option value="">{iv.defaultAccount}</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
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
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted opacity-0 transition-opacity duration-150 hover:bg-surface-2 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:invisible"
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

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label={iv.notes} htmlFor="notes" optional={dict.common.optional}>
          <Textarea id="notes" name="notes" maxLength={2000} dir="auto" defaultValue={draft?.notes ?? ""} />
        </Field>
        <Field label={iv.terms} htmlFor="terms" optional={dict.common.optional}>
          <Textarea id="terms" name="terms" maxLength={2000} dir="auto" defaultValue={draft?.terms ?? ""} />
        </Field>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-muted">{totals.invalid ? t(dict.journals.keyboardHint, { scale }) : iv.estimate}</p>
        <div className="flex gap-2">
          <SubmitButton variant="secondary" pending={pending && intent === "draft"} value="draft">
            {iv.saveDraft}
          </SubmitButton>
          <SubmitButton pending={pending && intent === "issue"} disabled={pending || totals.invalid || totals.total <= 0n} value="issue">
            {iv.saveAndIssue}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
