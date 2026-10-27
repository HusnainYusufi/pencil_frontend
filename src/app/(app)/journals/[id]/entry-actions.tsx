"use client";

import { Send, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { Dialog, FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { deleteJournal, postJournal, reverseJournal } from "../actions";

export function PostButton({ id }: { id: string }) {
  const { dict } = useI18n();
  const [key] = useState(() => crypto.randomUUID());
  return (
    <form action={postJournal}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="idempotencyKey" value={key} />
      <SubmitButton pendingLabel={dict.common.working}>
        <Send className="size-4 rtl:-scale-x-100" aria-hidden />
        {dict.journals.post}
      </SubmitButton>
    </form>
  );
}

export function DeleteDraftButton({ id }: { id: string }) {
  const { dict } = useI18n();
  return (
    <Dialog
      triggerVariant="ghost"
      triggerSize="md"
      trigger={
        <>
          <Trash2 className="size-4" aria-hidden />
          {dict.journals.deleteDraft}
        </>
      }
      title={dict.journals.deleteDraft}
      description={dict.journals.deleteConfirm}
    >
      {(close) => (
        <form action={deleteJournal} className="flex justify-end gap-2">
          <input type="hidden" name="id" value={id} />
          <Button type="button" variant="secondary" onClick={close}>
            {dict.common.cancel}
          </Button>
          <SubmitButton variant="danger">{dict.common.delete}</SubmitButton>
        </form>
      )}
    </Dialog>
  );
}

export function ReverseDialog({ id, today }: { id: string; today: string }) {
  const { dict } = useI18n();
  return (
    <Dialog
      triggerVariant="secondary"
      triggerSize="md"
      trigger={
        <>
          <Undo2 className="size-4" aria-hidden />
          {dict.journals.reverse}
        </>
      }
      title={dict.journals.reverseTitle}
      description={dict.journals.reverseBody}
    >
      {(close) => <ReverseForm id={id} today={today} onCancel={close} />}
    </Dialog>
  );
}

function ReverseForm({ id, today, onCancel }: { id: string; today: string; onCancel: () => void }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(reverseJournal);
  const [key] = useState(() => crypto.randomUUID());
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="idempotencyKey" value={key} />
      <FormMessage tone="danger">{state.error}</FormMessage>
      <Field label={dict.journals.reversalDate} htmlFor="reverse-date" error={errors.date}>
        <Input id="reverse-date" name="date" type="date" defaultValue={today} className="w-48" />
      </Field>
      <Field label={dict.journals.memo} htmlFor="reverse-memo" optional={dict.common.optional}>
        <Textarea id="reverse-memo" name="memo" maxLength={1000} dir="auto" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {dict.common.cancel}
        </Button>
        <SubmitButton variant="danger" pending={pending}>
          {dict.journals.reverse}
        </SubmitButton>
      </div>
    </form>
  );
}
