"use client";

import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Field, Input } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { acceptInvitation } from "../actions";

export function AcceptForm({ token, needsPassword, fullName }: { token: string; needsPassword: boolean; fullName: string }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(acceptInvitation);
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="needsPassword" value={needsPassword ? "1" : "0"} />
      <FormMessage tone="danger">{state.error}</FormMessage>
      {needsPassword && (
        <>
          <Field label={dict.auth.fullName} htmlFor="fullName">
            <Input id="fullName" name="fullName" defaultValue={fullName} maxLength={150} dir="auto" autoComplete="name" />
          </Field>
          <Field label={dict.auth.password} htmlFor="password" hint={dict.auth.passwordHint} error={errors.password}>
            <Input id="password" name="password" type="password" dir="ltr" autoComplete="new-password" autoFocus required aria-invalid={Boolean(errors.password)} />
          </Field>
        </>
      )}
      <SubmitButton className="w-full" pending={pending}>
        {dict.auth.acceptInvite}
      </SubmitButton>
    </form>
  );
}
