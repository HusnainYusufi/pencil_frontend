"use client";

import { useState } from "react";
import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { ButtonLink, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { UNIT_CODES, type Item, type ItemType } from "@/lib/types";
import { saveItem } from "./actions";

export interface Option {
  id: string;
  label: string;
}

export function ItemForm({
  item,
  revenueAccounts,
  costAccounts,
  salesTaxCodes,
  purchaseTaxCodes,
}: {
  item?: Item;
  revenueAccounts: Option[];
  costAccounts: Option[];
  salesTaxCodes: Option[];
  purchaseTaxCodes: Option[];
}) {
  const { dict } = useI18n();
  const it = dict.items;
  const { state, pending, onSubmit, errors } = useActionForm(saveItem);
  const [type, setType] = useState<ItemType>(item?.type ?? "GOODS");
  const units = it.units as Record<string, string>;

  const select = (name: string, label: string, options: Option[], current: string | null | undefined) => (
    <Field label={label} htmlFor={name} error={errors[name]} hint={item ? undefined : it.defaultHint}>
      <Select id={name} name={name} defaultValue={current ?? ""} aria-invalid={Boolean(errors[name])}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {item && <input type="hidden" name="id" value={item.id} />}
      <FormMessage tone="danger">{state.error}</FormMessage>

      <section className="space-y-4 rounded-lg border border-line bg-surface p-5 shadow-card">
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">{it.type}</legend>
          <div className="flex gap-4 text-[13.5px]">
            {(["GOODS", "SERVICE"] as const).map((value) => (
              <label key={value} className="flex items-center gap-2">
                <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="size-4 accent-ink" />
                {value === "GOODS" ? it.goods : it.services}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 md:grid-cols-[12rem_1fr_1fr]">
          <Field label={it.code} htmlFor="code" error={errors.code}>
            <Input id="code" name="code" required maxLength={40} dir="ltr" className="font-mono" defaultValue={item?.code} aria-invalid={Boolean(errors.code)} />
          </Field>
          <Field label={it.name} htmlFor="name" error={errors.name}>
            <Input id="name" name="name" required maxLength={200} dir="auto" defaultValue={item?.name} aria-invalid={Boolean(errors.name)} />
          </Field>
          <Field label={it.nameAr} htmlFor="nameAr" optional={dict.common.optional}>
            <Input id="nameAr" name="nameAr" maxLength={200} dir="rtl" lang="ar" defaultValue={item?.nameAr ?? ""} />
          </Field>
        </div>
        <Field label={it.description} htmlFor="description" optional={dict.common.optional}>
          <Textarea id="description" name="description" maxLength={1000} dir="auto" defaultValue={item?.description ?? ""} />
        </Field>
      </section>

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card md:grid-cols-3">
        <Field label={it.unit} htmlFor="unitCode" error={errors.unitCode}>
          <Select id="unitCode" name="unitCode" key={type} defaultValue={item?.unitCode ?? (type === "SERVICE" ? "C62" : "PCE")}>
            {UNIT_CODES.map((code) => (
              <option key={code} value={code}>
                {units[code]} ({code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label={it.salePrice} htmlFor="salePrice" optional={dict.common.optional} error={errors.salePrice}>
          <Input id="salePrice" name="salePrice" inputMode="decimal" dir="ltr" className="text-end font-mono" defaultValue={item?.salePrice ?? ""} aria-invalid={Boolean(errors.salePrice)} />
        </Field>
        <Field label={it.purchasePrice} htmlFor="purchasePrice" optional={dict.common.optional} error={errors.purchasePrice}>
          <Input id="purchasePrice" name="purchasePrice" inputMode="decimal" dir="ltr" className="text-end font-mono" defaultValue={item?.purchasePrice ?? ""} aria-invalid={Boolean(errors.purchasePrice)} />
        </Field>
      </section>

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card md:grid-cols-2">
        {select("salesAccountId", it.salesAccount, revenueAccounts, item?.salesAccount?.id)}
        {select("salesTaxCodeId", it.salesTax, salesTaxCodes, item?.salesTaxCode?.id)}
        {select("purchaseAccountId", it.purchaseAccount, costAccounts, item?.purchaseAccount?.id)}
        {select("purchaseTaxCodeId", it.purchaseTax, purchaseTaxCodes, item?.purchaseTaxCode?.id)}
      </section>

      <div className="flex justify-end gap-2">
        <ButtonLink href={item ? `/items/${item.id}` : "/items"} variant="secondary">
          {dict.common.cancel}
        </ButtonLink>
        <SubmitButton pending={pending}>{dict.common.save}</SubmitButton>
      </div>
    </form>
  );
}
