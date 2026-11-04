"use client";

import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Field, Input, Select } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { onboardZatca } from "./actions";

export function OnboardForm({ hasActive }: { hasActive: boolean }) {
  const { dict } = useI18n();
  const e = dict.einvoicing;
  const { state, pending, onSubmit, errors } = useActionForm(onboardZatca);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage tone="danger">
        {state.error}
        {state.details && (
          <ul className="mt-2 list-disc space-y-0.5 ps-5 font-mono text-[12px]" dir="ltr">
            {state.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </FormMessage>
      <FormMessage tone="success">{state.ok ? state.message : undefined}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={e.environment} htmlFor="environment" error={errors.environment}>
          <Select id="environment" name="environment" defaultValue="SIMULATION">
            {(["SANDBOX", "SIMULATION", "PRODUCTION"] as const).map((env) => (
              <option key={env} value={env}>
                {e.environments[env]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={e.otp} htmlFor="otp" hint={e.otpHint} error={errors.otp}>
          <Input id="otp" name="otp" inputMode="numeric" maxLength={6} dir="ltr" autoComplete="one-time-code" className="font-mono" required />
        </Field>
        <Field label={e.deviceName} htmlFor="name" optional={dict.common.optional}>
          <Input id="name" name="name" maxLength={100} dir="auto" />
        </Field>
        <Field label={e.organizationUnit} htmlFor="organizationUnit" optional={dict.common.optional}>
          <Input id="organizationUnit" name="organizationUnit" maxLength={100} dir="auto" />
        </Field>
      </div>
      {hasActive && <p className="text-[12.5px] text-warning">{e.replaceWarning}</p>}
      <div className="flex justify-end">
        <SubmitButton pending={pending} pendingLabel={e.onboarding}>
          {e.onboard}
        </SubmitButton>
      </div>
    </form>
  );
}
