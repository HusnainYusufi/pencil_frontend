"use client";

import { Plus } from "lucide-react";
import { useEffect } from "react";
import { Dialog, FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { ACCOUNT_TYPES, SUBTYPES_BY_TYPE } from "@/lib/types";
import { createAccount } from "./actions";

export interface ParentOption {
  id: string;
  label: string;
}

export function NewAccountDialog({ parents }: { parents: ParentOption[] }) {
  const { dict } = useI18n();
  return (
    <Dialog
      triggerVariant="primary"
      triggerSize="md"
      trigger={
        <>
          <Plus className="size-4" aria-hidden />
          {dict.accounts.newAccount}
        </>
      }
      title={dict.accounts.newAccount}
    >
      {(close) => <NewAccountForm parents={parents} onDone={close} />}
    </Dialog>
  );
}

function NewAccountForm({ parents, onDone }: { parents: ParentOption[]; onDone: () => void }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(createAccount);
  const subtypes = dict.accounts.subtypes as Record<string, string>;

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field label={dict.accounts.code} htmlFor="code" error={errors.code}>
          <Input id="code" name="code" dir="ltr" required maxLength={20} className="font-mono" autoFocus aria-invalid={Boolean(errors.code)} />
        </Field>
        <Field label={dict.accounts.category} htmlFor="subtype" error={errors.subtype}>
          <Select id="subtype" name="subtype" required defaultValue="" aria-invalid={Boolean(errors.subtype)}>
            <option value="" disabled>
              —
            </option>
            {ACCOUNT_TYPES.map((type) => (
              <optgroup key={type} label={dict.accounts.types[type]}>
                {SUBTYPES_BY_TYPE[type].map((subtype) => (
                  <option key={subtype} value={subtype}>
                    {subtypes[subtype]}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={dict.accounts.nameEn} htmlFor="name" error={errors.name}>
        <Input id="name" name="name" dir="ltr" required maxLength={150} aria-invalid={Boolean(errors.name)} />
      </Field>
      <Field label={dict.accounts.nameAr} htmlFor="nameAr" optional={dict.common.optional} error={errors.nameAr}>
        <Input id="nameAr" name="nameAr" dir="rtl" lang="ar" maxLength={150} aria-invalid={Boolean(errors.nameAr)} />
      </Field>
      <Field label={dict.accounts.parent} htmlFor="parentId" error={errors.parentId}>
        <Select id="parentId" name="parentId" defaultValue="">
          <option value="">{dict.accounts.noParent}</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.label}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2.5 text-[13px] text-ink-2">
        <input type="checkbox" name="isGroup" className="size-4 accent-ink" />
        {dict.accounts.isGroup}
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          {dict.common.cancel}
        </Button>
        <SubmitButton pending={pending}>{dict.common.create}</SubmitButton>
      </div>
    </form>
  );
}
