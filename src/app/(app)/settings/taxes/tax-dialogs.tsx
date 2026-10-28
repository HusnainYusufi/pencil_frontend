"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import type { TaxCodeKind, TaxTreatment } from "@/lib/types";
import { addTaxRate, createTaxCode } from "./actions";

const TREATMENTS: Record<TaxCodeKind, TaxTreatment[]> = {
  SALES: ["STANDARD", "ZERO_RATED", "EXEMPT", "OUT_OF_SCOPE"],
  PURCHASE: ["STANDARD", "ZERO_RATED", "EXEMPT", "OUT_OF_SCOPE", "IMPORT"],
  WITHHOLDING: ["WITHHOLDING"],
};

export function NewTaxCodeDialog({ accounts, today }: { accounts: Array<{ id: string; label: string; type: string }>; today: string }) {
  const { dict } = useI18n();
  return (
    <Dialog
      triggerVariant="primary"
      triggerSize="md"
      trigger={
        <>
          <Plus className="size-4" aria-hidden />
          {dict.taxes.newCode}
        </>
      }
      title={dict.taxes.newCode}
    >
      {(close) => <NewTaxCodeForm accounts={accounts} today={today} onDone={close} />}
    </Dialog>
  );
}

function NewTaxCodeForm({ accounts, today, onDone }: { accounts: Array<{ id: string; label: string; type: string }>; today: string; onDone: () => void }) {
  const { dict } = useI18n();
  const tx = dict.taxes;
  const { state, pending, onSubmit, errors } = useActionForm(createTaxCode);
  const [kind, setKind] = useState<TaxCodeKind>("SALES");
  const treatments = tx.treatments as Record<string, string>;
  // Output and withholding tax are liabilities; recoverable input tax is an asset.
  const taxAccounts = accounts.filter((a) => (kind === "PURCHASE" ? a.type === "ASSET" : a.type === "LIABILITY"));
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tx.kind} htmlFor="kind">
          <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as TaxCodeKind)}>
            <option value="SALES">{tx.sales}</option>
            <option value="PURCHASE">{tx.purchases}</option>
            <option value="WITHHOLDING">{tx.withholding}</option>
          </Select>
        </Field>
        <Field label={tx.treatment} htmlFor="treatment" error={errors.treatment}>
          <Select id="treatment" name="treatment" key={kind}>
            {TREATMENTS[kind].map((t) => (
              <option key={t} value={t}>
                {treatments[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tx.code} htmlFor="code" error={errors.code}>
          <Input id="code" name="code" required maxLength={30} dir="ltr" className="font-mono" aria-invalid={Boolean(errors.code)} />
        </Field>
        <Field label={tx.account} htmlFor="taxAccountId" error={errors.taxAccountId}>
          <Select id="taxAccountId" name="taxAccountId" key={`acc-${kind}`} defaultValue="">
            <option value="">—</option>
            {taxAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.accounts.nameEn} htmlFor="name" error={errors.name}>
          <Input id="name" name="name" required maxLength={150} dir="ltr" />
        </Field>
        <Field label={dict.accounts.nameAr} htmlFor="nameAr" error={errors.nameAr}>
          <Input id="nameAr" name="nameAr" required maxLength={150} dir="rtl" lang="ar" />
        </Field>
        <Field label={tx.newRate} htmlFor="ratePercent" error={errors.ratePercent}>
          <Input id="ratePercent" name="ratePercent" required inputMode="decimal" dir="ltr" className="font-mono" aria-invalid={Boolean(errors.ratePercent)} />
        </Field>
        <Field label={tx.effectiveFrom} htmlFor="effectiveFrom" error={errors.effectiveFrom}>
          <Input id="effectiveFrom" name="effectiveFrom" type="date" required defaultValue={today} />
        </Field>
      </div>
      {kind === "PURCHASE" && (
        <label className="flex items-center gap-2.5 text-[13px] text-ink-2">
          <input type="checkbox" name="recoverable" defaultChecked className="size-4 accent-ink" />
          {tx.recoverable}
        </label>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          {dict.common.cancel}
        </Button>
        <SubmitButton pending={pending}>{dict.common.create}</SubmitButton>
      </div>
    </form>
  );
}

export function ChangeRateDialog({ id, code, today }: { id: string; code: string; today: string }) {
  const { dict } = useI18n();
  return (
    <Dialog triggerVariant="ghost" trigger={dict.taxes.changeRate} title={`${dict.taxes.changeRate} · ${code}`}>
      {(close) => <ChangeRateForm id={id} today={today} onDone={close} />}
    </Dialog>
  );
}

function ChangeRateForm({ id, today, onDone }: { id: string; today: string; onDone: () => void }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(addTaxRate);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={id} />
      <FormMessage tone="danger">{state.error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dict.taxes.newRate} htmlFor="rate-new" error={errors.ratePercent}>
          <Input id="rate-new" name="ratePercent" required inputMode="decimal" dir="ltr" className="font-mono" />
        </Field>
        <Field label={dict.taxes.effectiveFrom} htmlFor="rate-from" error={errors.effectiveFrom}>
          <Input id="rate-from" name="effectiveFrom" type="date" required defaultValue={today} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          {dict.common.cancel}
        </Button>
        <SubmitButton pending={pending}>{dict.common.save}</SubmitButton>
      </div>
    </form>
  );
}
