"use client";

import { useState } from "react";
import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { cn, Field, Input } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { signup } from "../actions";

export function SignupForm() {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(signup);
  const [country, setCountry] = useState<"SA" | "JO">("SA");
  const invalid = (name: string) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <Field label={dict.auth.fullName} htmlFor="fullName" error={errors.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" autoFocus required {...invalid("fullName")} />
      </Field>
      <Field label={dict.auth.email} htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" dir="ltr" autoComplete="email" required {...invalid("email")} />
      </Field>
      <Field label={dict.auth.password} htmlFor="password" hint={dict.auth.passwordHint} error={errors.password}>
        <Input id="password" name="password" type="password" dir="ltr" autoComplete="new-password" minLength={10} required {...invalid("password")} />
      </Field>

      <div className="border-t border-line pt-4" />

      <Field label={dict.auth.companyName} htmlFor="legalName" error={errors.legalName}>
        <Input id="legalName" name="legalName" autoComplete="organization" required {...invalid("legalName")} />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-ink">{dict.auth.country}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["SA", "JO"] as const).map((code) => (
            <label
              key={code}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center rounded-md border text-[13.5px] transition-colors duration-150",
                "has-focus-visible:ring-3 has-focus-visible:ring-focus/25",
                country === code ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2",
              )}
            >
              <input
                type="radio"
                name="country"
                value={code}
                checked={country === code}
                onChange={() => setCountry(code)}
                className="sr-only"
              />
              {code === "SA" ? dict.auth.saudiArabia : dict.auth.jordan}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label={country === "SA" ? dict.auth.vatNumberSA : dict.auth.vatNumberJO}
        htmlFor="taxNumber"
        optional={dict.common.optional}
        hint={country === "SA" ? dict.auth.vatHintSA : dict.auth.vatHintJO}
        error={errors.taxNumber}
      >
        <Input
          id="taxNumber"
          name="taxNumber"
          inputMode="numeric"
          dir="ltr"
          maxLength={15}
          className="font-mono"
          {...invalid("taxNumber")}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel={dict.auth.creatingAccount} pending={pending}>
        {dict.auth.createAccount}
      </SubmitButton>
    </form>
  );
}
