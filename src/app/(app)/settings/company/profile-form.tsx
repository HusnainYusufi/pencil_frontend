"use client";

import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Field, Input, Select } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import type { TaxProfile } from "@/lib/types";
import { saveTaxProfile } from "./actions";

export function TaxProfileForm({ profile, canEdit }: { profile: TaxProfile; canEdit: boolean }) {
  const { dict } = useI18n();
  const ct = dict.companyTax;
  const c = dict.contacts;
  const { state, pending, onSubmit, errors } = useActionForm(saveTaxProfile);
  const saudi = profile.country === "SA";
  const registrations = saudi ? (["REGISTERED", "NOT_REGISTERED"] as const) : (["REGISTERED", "SPECIAL_SALES_TAX", "NOT_REGISTERED"] as const);
  const filings = saudi ? (["QUARTERLY", "MONTHLY"] as const) : (["BIMONTHLY", "MONTHLY"] as const);

  const text = (name: keyof TaxProfile, label: string, props: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Field label={label} htmlFor={name} error={errors[name]}>
      <Input id={name} name={name} defaultValue={(profile[name] as string | null) ?? ""} disabled={!canEdit} aria-invalid={Boolean(errors[name])} {...props} />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <FormMessage tone="success">{state.ok ? state.message : undefined}</FormMessage>

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card md:grid-cols-2">
        <Field label={ct.registration} htmlFor="registration" error={errors.registration}>
          <Select id="registration" name="registration" defaultValue={profile.registration} disabled={!canEdit}>
            {registrations.map((r) => (
              <option key={r} value={r}>
                {ct.registrations[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={ct.filing} htmlFor="filingFrequency" error={errors.filingFrequency}>
          <Select id="filingFrequency" name="filingFrequency" defaultValue={profile.filingFrequency} disabled={!canEdit}>
            {filings.map((f) => (
              <option key={f} value={f}>
                {ct.filings[f]}
              </option>
            ))}
          </Select>
        </Field>
        {text("taxNumber", saudi ? ct.taxNumberSA : ct.taxNumberJO, { dir: "ltr", inputMode: "numeric", className: "font-mono", maxLength: 15 })}
        {text("commercialRegistration", ct.commercialRegistration, { dir: "ltr", className: "font-mono", maxLength: 32 })}
        {!saudi && text("activityNumber", ct.activityNumber, { dir: "ltr", className: "font-mono", maxLength: 30 })}
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-surface p-5 shadow-card">
        <h2 className="text-[13px] font-semibold">{saudi ? ct.nationalAddress : ct.address}</h2>
        <div className={saudi ? "grid gap-4 md:grid-cols-[8rem_1fr_1fr]" : "grid gap-4 md:grid-cols-2"}>
          {saudi && text("buildingNumber", c.buildingNumber, { dir: "ltr", inputMode: "numeric", maxLength: 4 })}
          {text("street", c.street, { dir: "auto", maxLength: 150 })}
          {text("district", c.district, { dir: "auto", maxLength: 100 })}
          {text("city", c.city, { dir: "auto", maxLength: 100 })}
          {text("postalCode", c.postalCode, { dir: "ltr", inputMode: "numeric", maxLength: saudi ? 5 : 10 })}
          {saudi && text("additionalNumber", c.additionalNumber, { dir: "ltr", inputMode: "numeric", maxLength: 4 })}
        </div>
      </section>

      {canEdit ? (
        <div className="flex justify-end">
          <SubmitButton pending={pending}>{dict.common.save}</SubmitButton>
        </div>
      ) : (
        <p className="text-[12.5px] text-muted">{ct.ownersOnly}</p>
      )}
    </form>
  );
}
