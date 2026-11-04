"use client";

import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Field, Input } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { requestPasswordReset } from "../actions";

export function ForgotForm() {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(requestPasswordReset);
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <FormMessage tone="success">{state.ok ? state.message : undefined}</FormMessage>
      <Field label={dict.auth.email} htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" dir="ltr" autoComplete="username" autoFocus required aria-invalid={Boolean(errors.email)} />
      </Field>
      <SubmitButton className="w-full" pending={pending}>
        {dict.auth.sendLink}
      </SubmitButton>
    </form>
  );
}
