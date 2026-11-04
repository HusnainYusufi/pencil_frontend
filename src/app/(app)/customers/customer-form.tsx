"use client";

import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { ID_SCHEMES, type Contact } from "@/lib/types";
import { saveCustomer } from "./actions";

export function CustomerForm({ contact, next }: { contact?: Contact; next?: string }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(saveCustomer);
  const c = dict.customers;
  const schemes = c.idSchemes as Record<string, string>;
  const text = (name: string, label: string, value: string | null | undefined, opts: { dir?: "ltr" | "auto"; max?: number; hint?: string } = {}) => (
    <Field label={label} htmlFor={name} optional={name === "name" ? undefined : dict.common.optional} error={errors[name]} hint={opts.hint}>
      <Input id={name} name={name} defaultValue={value ?? ""} dir={opts.dir ?? "auto"} maxLength={opts.max ?? 200} aria-invalid={Boolean(errors[name])} />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {contact && <input type="hidden" name="id" value={contact.id} />}
      {next && <input type="hidden" name="next" value={next} />}
      <FormMessage tone="danger">{state.error}</FormMessage>

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card sm:grid-cols-2">
        <Field label={c.type} htmlFor="type">
          <Select id="type" name="type" defaultValue={contact?.type ?? "BUSINESS"}>
            <option value="BUSINESS">{c.business}</option>
            <option value="INDIVIDUAL">{c.individual}</option>
          </Select>
        </Field>
        {text("code", c.code, contact?.code, { dir: "ltr", max: 30 })}
        {text("name", c.name, contact?.name)}
        {text("nameAr", c.nameAr, contact?.nameAr)}
        {text("email", c.email, contact?.email, { dir: "ltr", max: 254 })}
        {text("phone", c.phone, contact?.phone, { dir: "ltr", max: 32 })}
        {text("taxNumber", c.taxNumber, contact?.taxNumber, { dir: "ltr", max: 32 })}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <Field label={c.idScheme} htmlFor="idScheme" optional={dict.common.optional} error={errors.idScheme}>
            <Select id="idScheme" name="idScheme" defaultValue={contact?.idScheme ?? ""}>
              <option value="">—</option>
              {ID_SCHEMES.map((s) => (
                <option key={s} value={s}>
                  {schemes[s]}
                </option>
              ))}
            </Select>
          </Field>
          {text("idNumber", c.idNumber, contact?.idNumber, { dir: "ltr", max: 50 })}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-line bg-surface p-5 shadow-card">
        <div>
          <h2 className="text-[13px] font-semibold tracking-wide">{c.address}</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">{c.zatcaHint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {text("addressStreet", c.street, contact?.address.street)}
          {text("addressBuildingNumber", c.buildingNumber, contact?.address.buildingNumber, { dir: "ltr", max: 20 })}
          {text("addressAdditionalNumber", c.additionalNumber, contact?.address.additionalNumber, { dir: "ltr", max: 20 })}
          {text("addressDistrict", c.district, contact?.address.district, { max: 100 })}
          {text("addressCity", c.city, contact?.address.city, { max: 100 })}
          {text("addressPostalCode", c.postalCode, contact?.address.postalCode, { dir: "ltr", max: 20 })}
          {text("addressRegion", c.region, contact?.address.region, { max: 100 })}
          {text("addressCountry", c.country, contact?.address.country, { dir: "ltr", max: 2 })}
          {text("paymentTermsDays", c.paymentTerms, contact?.paymentTermsDays?.toString(), { dir: "ltr", max: 3 })}
        </div>
        <Field label={c.notes} htmlFor="notes" optional={dict.common.optional}>
          <Textarea id="notes" name="notes" defaultValue={contact?.notes ?? ""} maxLength={2000} dir="auto" />
        </Field>
      </section>

      <div className="flex justify-end">
        <SubmitButton pending={pending}>{dict.common.save}</SubmitButton>
      </div>
    </form>
  );
}
