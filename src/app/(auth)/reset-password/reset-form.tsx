"use client";

import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Field, Input } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { resetPassword } from "../actions";

export function ResetForm({ token }: { token: string }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(resetPassword);
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage tone="danger">{state.error}</FormMessage>
      <Field label={dict.auth.newPassword} htmlFor="password" hint={dict.auth.passwordHint} error={errors.password}>
        <Input id="password" name="password" type="password" dir="ltr" autoComplete="new-password" autoFocus required aria-invalid={Boolean(errors.password)} />
      </Field>
      <SubmitButton className="w-full" pending={pending}>
        {dict.auth.savePassword}
      </SubmitButton>
    </form>
  );
}
