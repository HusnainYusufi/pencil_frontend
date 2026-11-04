"use client";

import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Field, Input } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import type { CompanyProfile } from "@/lib/types";
import { saveCompany } from "./actions";

export function CompanyForm({ company, readOnly }: { company: CompanyProfile; readOnly: boolean }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(saveCompany);
  const cp = dict.companyProfile;
  const c = dict.customers;
  const field = (name: keyof CompanyProfile, label: string, opts: { dir?: "ltr" | "auto"; max?: number } = {}) => (
    <Field label={label} htmlFor={name} error={errors[name]}>
      <Input
        id={name}
        name={name}
        defaultValue={(company[name] as string | null) ?? ""}
        dir={opts.dir ?? "auto"}
        maxLength={opts.max ?? 200}
        readOnly={readOnly}
        aria-invalid={Boolean(errors[name])}
      />
    </Field>
  );
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <FormMessage tone="success">{state.ok ? state.message : undefined}</FormMessage>
      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card sm:grid-cols-2">
        <Field label={cp.legalName} htmlFor="legalName">
          <Input id="legalName" defaultValue={company.legalName} readOnly disabled />
        </Field>
        {field("tradeName", cp.tradeName)}
        {field("taxNumber", cp.taxNumber, { dir: "ltr", max: 32 })}
        {field("commercialRegistration", cp.commercialRegistration, { dir: "ltr", max: 32 })}
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-surface p-5 shadow-card">
        <div>
          <h2 className="text-[13px] font-semibold tracking-wide">{c.address}</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">{c.zatcaHint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {field("addressStreet", c.street)}
          {field("addressBuildingNumber", c.buildingNumber, { dir: "ltr", max: 20 })}
          {field("addressAdditionalNumber", c.additionalNumber, { dir: "ltr", max: 20 })}
          {field("addressDistrict", c.district, { max: 100 })}
          {field("addressCity", c.city, { max: 100 })}
          {field("addressPostalCode", c.postalCode, { dir: "ltr", max: 20 })}
          {field("addressRegion", c.region, { max: 100 })}
        </div>
      </section>
      {!readOnly && (
        <div className="flex justify-end">
          <SubmitButton pending={pending}>{dict.common.save}</SubmitButton>
        </div>
      )}
    </form>
  );
}
