"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Amount } from "@/components/amount";
import { FormMessage, SubmitButton } from "@/components/ui/interactive";
import { cn, Field, Input, Select } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { formatAmount, formatDate, minorUnits } from "@/i18n/format";
import { fromMinor, toMinor } from "@/lib/money";
import { PAYMENT_MEANS } from "@/lib/types";
import { recordPayment } from "../actions";

export interface OpenInvoice {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string | null;
  balanceDue: string;
}

export function PaymentForm({
  customers,
  accounts,
  contactId,
  invoices,
  preselect,
  currency,
  today,
}: {
  customers: Array<{ id: string; label: string }>;
  accounts: Array<{ id: string; label: string }>;
  contactId?: string;
  invoices: OpenInvoice[];
  preselect?: string;
  currency: string;
  today: string;
}) {
  const { dict, locale } = useI18n();
  const p = dict.payments;
  const router = useRouter();
  const scale = minorUnits(currency);
  const [state, dispatch, pending] = useActionState(recordPayment, {});
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(invoices.filter((i) => !preselect || i.id === preselect).slice(0, preselect ? 1 : 0).map((i) => [i.id, i.balanceDue])),
  );
  const key = useRef("");
  useEffect(() => {
    key.current = crypto.randomUUID();
  }, [state]);

  const total = Object.values(amounts).reduce((sum, v) => sum + (toMinor(v, scale) ?? 0n), 0n);
  const invalid = Object.entries(amounts).some(([id, v]) => {
    const m = toMinor(v, scale);
    const due = toMinor(invoices.find((i) => i.id === id)?.balanceDue ?? "0", scale) ?? 0n;
    return m === null || m < 0n || m > due;
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("allocations", JSON.stringify(Object.entries(amounts).map(([invoiceId, amount]) => ({ invoiceId, amount }))));
    data.set("amount", fromMinor(total, scale));
    data.set("idempotencyKey", key.current);
    startTransition(() => dispatch(data));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-3">
        <Field label={p.customer} htmlFor="contactId" error={state.fieldErrors?.contactId}>
          <Select
            id="contactId"
            name="contactId"
            value={contactId ?? ""}
            onChange={(e) => router.push(e.target.value ? `/payments/new?contact=${e.target.value}` : "/payments/new")}
          >
            <option value="">{dict.invoices.selectCustomer}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={p.date} htmlFor="date" error={state.fieldErrors?.date}>
          <Input id="date" name="date" type="date" defaultValue={today} required />
        </Field>
        <Field label={p.depositTo} htmlFor="accountId" error={state.fieldErrors?.accountId}>
          <Select id="accountId" name="accountId" defaultValue={accounts[0]?.id ?? ""}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={p.method} htmlFor="method">
          <Select id="method" name="method" defaultValue="BANK_TRANSFER">
            {PAYMENT_MEANS.filter((m) => m !== "CREDIT").map((m) => (
              <option key={m} value={m}>
                {dict.invoices.paymentMeans[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={p.reference} htmlFor="reference" optional={dict.common.optional}>
          <Input id="reference" name="reference" maxLength={100} dir="auto" />
        </Field>
        <Field label={p.notes} htmlFor="notes" optional={dict.common.optional}>
          <Input id="notes" name="notes" maxLength={1000} dir="auto" />
        </Field>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <h2 className="border-b border-line px-5 py-3.5 text-[13px] font-semibold">{p.allocations}</h2>
        {!contactId ? (
          <p className="px-5 py-8 text-center text-ink-2">{p.chooseCustomer}</p>
        ) : invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-ink-2">{p.noOpenInvoices}</p>
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                <th className="border-b border-line bg-surface-2/60 px-4 py-2.5 text-start font-medium">{dict.invoices.number}</th>
                <th className="border-b border-line bg-surface-2/60 px-4 py-2.5 text-start font-medium">{dict.invoices.dueDate}</th>
                <th className="border-b border-line bg-surface-2/60 px-4 py-2.5 text-end font-medium">{dict.invoices.balanceDue}</th>
                <th className="border-b border-line bg-surface-2/60 px-4 py-2.5 text-end font-medium">{p.allocate}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const value = amounts[inv.id] ?? "";
                return (
                  <tr key={inv.id}>
                    <td className="border-b border-line px-4 py-2 font-mono text-[12.5px]">
                      <span className="num">{inv.number}</span>
                    </td>
                    <td className="border-b border-line px-4 py-2 text-ink-2">{formatDate(inv.dueDate ?? inv.issueDate, locale)}</td>
                    <td className="border-b border-line px-4 py-2 text-end">
                      <Amount value={inv.balanceDue} currency={currency} />
                    </td>
                    <td className="border-b border-line px-4 py-2 text-end">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          className="text-[12px] text-ink-2 underline underline-offset-2 hover:text-ink"
                          onClick={() => setAmounts((a) => ({ ...a, [inv.id]: inv.balanceDue }))}
                        >
                          {dict.common.all}
                        </button>
                        <Input
                          value={value}
                          inputMode="decimal"
                          dir="ltr"
                          aria-label={`${p.allocate} ${inv.number}`}
                          aria-invalid={value !== "" && (toMinor(value, scale) ?? -1n) > (toMinor(inv.balanceDue, scale) ?? 0n)}
                          className="h-9 w-32 text-end font-mono text-[13px] tabular"
                          onChange={(e) => {
                            if (/^[\d,]*\.?\d*$/.test(e.target.value)) setAmounts((a) => ({ ...a, [inv.id]: e.target.value }));
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className={cn("text-[14px]", invalid ? "text-danger" : "text-ink")}>
          {p.amount}: <span className="num font-mono font-semibold">{formatAmount(fromMinor(total, scale), currency)}</span>{" "}
          <span className="text-muted">{currency}</span>
        </p>
        <SubmitButton pending={pending} disabled={pending || invalid || total <= 0n}>
          {p.newPayment}
        </SubmitButton>
      </div>
    </form>
  );
}
