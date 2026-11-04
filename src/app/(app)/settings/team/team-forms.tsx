"use client";

import { UserPlus } from "lucide-react";
import { useEffect } from "react";
import { Dialog, FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Field, Input, Select } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { changeRole, inviteMember } from "./actions";

export interface RoleOption {
  id: string;
  label: string;
}

export function InviteDialog({ roles }: { roles: RoleOption[] }) {
  const { dict } = useI18n();
  return (
    <Dialog
      triggerVariant="primary"
      triggerSize="md"
      trigger={
        <>
          <UserPlus className="size-4" aria-hidden />
          {dict.team.invite}
        </>
      }
      title={dict.team.invite}
    >
      {(close) => <InviteForm roles={roles} onDone={close} />}
    </Dialog>
  );
}

function InviteForm({ roles, onDone }: { roles: RoleOption[]; onDone: () => void }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(inviteMember);
  useEffect(() => {
    if (state.ok) {
      const timer = setTimeout(onDone, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.ok, onDone]);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <FormMessage tone="success">{state.ok ? state.message : undefined}</FormMessage>
      <Field label={dict.team.email} htmlFor="invite-email" error={errors.email}>
        <Input id="invite-email" name="email" type="email" dir="ltr" required autoFocus aria-invalid={Boolean(errors.email)} />
      </Field>
      <Field label={dict.team.fullName} htmlFor="invite-name" error={errors.fullName}>
        <Input id="invite-name" name="fullName" maxLength={150} dir="auto" required aria-invalid={Boolean(errors.fullName)} />
      </Field>
      <Field label={dict.team.role} htmlFor="invite-role" error={errors.roleId}>
        <Select id="invite-role" name="roleId" defaultValue={roles.find((r) => r.label)?.id}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>{dict.team.invite}</SubmitButton>
      </div>
    </form>
  );
}

export function RoleSelect({ id, roleId, roles }: { id: string; roleId: string; roles: RoleOption[] }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit } = useActionForm(changeRole);
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Select name="roleId" defaultValue={roleId} aria-label={dict.team.changeRole} className="h-8 w-40 text-[13px]">
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </Select>
      <SubmitButton size="sm" variant="secondary" pending={pending}>
        {dict.common.save}
      </SubmitButton>
      {state.error && <span className="text-[12px] text-danger">{state.error}</span>}
    </form>
  );
}
