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
import { paySupplier } from "../../bills/actions";

export interface OpenBill {
  id: string;
  number: string;
  supplierReference: string | null;
  billDate: string;
  dueDate: string | null;
  balanceDue: string;
}

export function PayForm({
  suppliers,
  accounts,
  contactId,
  bills,
  preselect,
  currency,
  today,
}: {
  suppliers: Array<{ id: string; label: string }>;
  accounts: Array<{ id: string; label: string }>;
  contactId?: string;
  bills: OpenBill[];
  preselect?: string;
  currency: string;
  today: string;
}) {
  const { dict, locale } = useI18n();
  const p = dict.purchases;
  const router = useRouter();
  const scale = minorUnits(currency);
  const [state, dispatch, pending] = useActionState(paySupplier, {});
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const pick = bills.find((b) => b.id === preselect);
    return pick ? { [pick.id]: pick.balanceDue } : {};
  });
  const key = useRef("");
  useEffect(() => {
    key.current = crypto.randomUUID();
  }, [state]);

  const total = Object.values(amounts).reduce((s, v) => s + (toMinor(v, scale) ?? 0n), 0n);
  const invalid = Object.entries(amounts).some(([id, v]) => {
    const m = toMinor(v, scale);
    return m === null || m < 0n || m > (toMinor(bills.find((b) => b.id === id)?.balanceDue ?? "0", scale) ?? 0n);
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("allocations", JSON.stringify(Object.entries(amounts).map(([billId, amount]) => ({ billId, amount }))));
    data.set("amount", fromMinor(total, scale));
    data.set("idempotencyKey", key.current);
    startTransition(() => dispatch(data));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <Field label={p.supplier} htmlFor="contactId">
          <Select
            id="contactId"
            name="contactId"
            value={contactId ?? ""}
            onChange={(e) => router.push(e.target.value ? `/supplier-payments/new?contact=${e.target.value}` : "/supplier-payments/new")}
          >
            <option value="">{p.selectSupplier}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.payments.date} htmlFor="date">
          <Input id="date" name="date" type="date" defaultValue={today} required />
        </Field>
        <Field label={p.payFrom} htmlFor="accountId">
          <Select id="accountId" name="accountId" defaultValue={accounts[0]?.id ?? ""}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.payments.method} htmlFor="method">
          <Select id="method" name="method" defaultValue="BANK_TRANSFER">
            {PAYMENT_MEANS.filter((m) => m !== "CREDIT").map((m) => (
              <option key={m} value={m}>
                {dict.invoices.paymentMeans[m]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label={dict.payments.reference} htmlFor="reference" optional={dict.common.optional}>
            <Input id="reference" name="reference" maxLength={100} dir="auto" />
          </Field>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <h2 className="border-b border-line px-5 py-3.5 text-[13px] font-semibold">{p.openBills}</h2>
        {!contactId ? (
          <p className="px-5 py-8 text-center text-ink-2">{p.chooseSupplier}</p>
        ) : bills.length === 0 ? (
          <p className="px-5 py-8 text-center text-ink-2">{p.noOpenBills}</p>
        ) : (
          <table className="w-full border-collapse text-[13.5px]">
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="border-b border-line px-4 py-2 font-mono text-[12.5px]">
                    <span className="num">{b.number}</span>
                    {b.supplierReference && <span className="ms-2 text-muted">{b.supplierReference}</span>}
                  </td>
                  <td className="border-b border-line px-4 py-2 text-ink-2">{formatDate(b.dueDate ?? b.billDate, locale)}</td>
                  <td className="border-b border-line px-4 py-2 text-end">
                    <Amount value={b.balanceDue} currency={currency} />
                  </td>
                  <td className="border-b border-line px-4 py-2 text-end">
                    <div className="inline-flex items-center gap-2">
                      <button type="button" className="text-[12px] text-ink-2 underline underline-offset-2" onClick={() => setAmounts((a) => ({ ...a, [b.id]: b.balanceDue }))}>
                        {dict.common.all}
                      </button>
                      <Input
                        value={amounts[b.id] ?? ""}
                        inputMode="decimal"
                        dir="ltr"
                        aria-label={`${dict.payments.allocate} ${b.number}`}
                        className="h-9 w-32 text-end font-mono text-[13px] tabular"
                        onChange={(e) => /^[\d,]*\.?\d*$/.test(e.target.value) && setAmounts((a) => ({ ...a, [b.id]: e.target.value }))}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className={cn("text-[14px]", invalid ? "text-danger" : "text-ink")}>
          {dict.payments.amount}: <span className="num font-mono font-semibold">{formatAmount(fromMinor(total, scale), currency)}</span>{" "}
          <span className="text-muted">{currency}</span>
        </p>
        <SubmitButton pending={pending} disabled={pending || invalid || total <= 0n}>
          {p.newPayment}
        </SubmitButton>
      </div>
    </form>
  );
}
