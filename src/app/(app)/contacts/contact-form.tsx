"use client";

import { useState } from "react";
import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { ButtonLink, cn, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { ID_SCHEMES, type Contact, type Ref } from "@/lib/types";
import { saveContact } from "./actions";

export function ContactForm({
  contact,
  companyCountry,
  withholdingCodes,
  countries,
}: {
  contact?: Contact;
  companyCountry: string;
  withholdingCodes: Ref[];
  /** Localised on the server (see countryOptions). */
  countries: Array<{ code: string; label: string }>;
}) {
  const { dict, locale } = useI18n();
  const c = dict.contacts;
  const { state, pending, onSubmit, errors } = useActionForm(saveContact);
  const [country, setCountry] = useState(contact?.country ?? companyCountry);
  const [supplier, setSupplier] = useState(contact?.isSupplier ?? false);
  const saudi = country === "SA";

  const text = (name: keyof Contact, label: string, props: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Field label={label} htmlFor={name} error={errors[name]} optional={name === "name" ? undefined : dict.common.optional}>
      <Input
        id={name}
        name={name}
        defaultValue={(contact?.[name] as string | null | undefined) ?? ""}
        aria-invalid={Boolean(errors[name])}
        {...props}
      />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {contact && <input type="hidden" name="id" value={contact.id} />}
      <FormMessage tone="danger">{state.error}</FormMessage>

      <section className="space-y-4 rounded-lg border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap gap-6">
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">{c.roles}</legend>
            <div className="flex gap-4 text-[13.5px]">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isCustomer" defaultChecked={contact?.isCustomer ?? true} className="size-4 accent-ink" />
                {c.customer}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isSupplier" checked={supplier} onChange={(e) => setSupplier(e.target.checked)} className="size-4 accent-ink" />
                {c.supplier}
              </label>
            </div>
            {errors.isCustomer && <p className="mt-1 text-[12.5px] text-danger">{errors.isCustomer}</p>}
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">{c.type}</legend>
            <div className="flex gap-4 text-[13.5px]">
              {(["BUSINESS", "INDIVIDUAL"] as const).map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input type="radio" name="type" value={type} defaultChecked={(contact?.type ?? "BUSINESS") === type} className="size-4 accent-ink" />
                  {type === "BUSINESS" ? c.business : c.individual}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_10rem]">
          {text("name", c.name, { required: true, maxLength: 200, dir: "auto" })}
          {text("nameAr", c.nameAr, { maxLength: 200, dir: "rtl", lang: "ar" })}
          {text("code", c.code, { maxLength: 30, dir: "ltr", className: "font-mono" })}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-surface p-5 shadow-card">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={c.country} htmlFor="country">
            <Select id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)}>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </Select>
          </Field>
          {text("taxNumber", c.taxNumber, { maxLength: 32, dir: "ltr", inputMode: saudi ? "numeric" : undefined, className: "font-mono" })}
          <div />
          <Field label={c.idScheme} htmlFor="idScheme" optional={dict.common.optional} hint={c.idHint}>
            <Select id="idScheme" name="idScheme" defaultValue={contact?.idScheme ?? ""}>
              <option value="">—</option>
              {ID_SCHEMES.map((scheme) => (
                <option key={scheme} value={scheme}>
                  {(c.idSchemes as Record<string, string>)[scheme]}
                </option>
              ))}
            </Select>
          </Field>
          {text("idNumber", c.idNumber, { maxLength: 50, dir: "ltr", className: "font-mono" })}
        </div>
        {saudi && <p className="text-[12.5px] text-muted">{c.taxNumberHint}</p>}
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-surface p-5 shadow-card">
        <div>
          <h2 className="text-[13px] font-semibold">{c.address}</h2>
          {saudi && <p className="mt-0.5 text-[12.5px] text-muted">{c.addressHint}</p>}
        </div>
        <div className={cn("grid gap-4", saudi ? "md:grid-cols-[8rem_1fr_1fr]" : "md:grid-cols-2")}>
          {saudi && text("buildingNumber", c.buildingNumber, { maxLength: 4, inputMode: "numeric", dir: "ltr" })}
          {text("street", c.street, { maxLength: 150, dir: "auto" })}
          {text("district", c.district, { maxLength: 100, dir: "auto" })}
          {text("city", c.city, { maxLength: 100, dir: "auto" })}
          {text("postalCode", c.postalCode, { maxLength: saudi ? 5 : 10, inputMode: "numeric", dir: "ltr" })}
          {saudi && text("additionalNumber", c.additionalNumber, { maxLength: 4, inputMode: "numeric", dir: "ltr" })}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card md:grid-cols-3">
        {text("email", c.email, { type: "email", maxLength: 254, dir: "ltr" })}
        <Field label={c.phone} htmlFor="phone" optional={dict.common.optional} hint={c.phoneHint} error={errors.phone}>
          <Input id="phone" name="phone" type="tel" dir="ltr" defaultValue={contact?.phone ?? ""} aria-invalid={Boolean(errors.phone)} />
        </Field>
        <Field label={c.paymentTerms} htmlFor="paymentTermsDays" error={errors.paymentTermsDays}>
          <Input id="paymentTermsDays" name="paymentTermsDays" type="number" min={0} max={365} dir="ltr" defaultValue={contact?.paymentTermsDays ?? 0} />
        </Field>
        {supplier && (
          <Field label={c.withholding} htmlFor="withholdingTaxCodeId" optional={dict.common.optional} hint={c.withholdingHint} error={errors.withholdingTaxCodeId}>
            <Select id="withholdingTaxCodeId" name="withholdingTaxCodeId" defaultValue={contact?.withholdingTaxCode?.id ?? ""}>
              <option value="">—</option>
              {withholdingCodes.map((code) => (
                <option key={code.id} value={code.id}>
                  {code.code} · {locale === "ar" && code.nameAr ? code.nameAr : code.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="md:col-span-3">
          <Field label={c.notes} htmlFor="notes" optional={dict.common.optional}>
            <Textarea id="notes" name="notes" maxLength={1000} dir="auto" defaultValue={contact?.notes ?? ""} />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <ButtonLink href={contact ? `/contacts/${contact.id}` : "/contacts"} variant="secondary">
          {dict.common.cancel}
        </ButtonLink>
        <SubmitButton pending={pending}>{dict.common.save}</SubmitButton>
      </div>
    </form>
  );
}
