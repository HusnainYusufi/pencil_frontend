"use client";

import { Ban, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Button, Field, Textarea } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { deleteBill, postBill, voidBill } from "../actions";

export function PostBillButton({ id }: { id: string }) {
  const { dict } = useI18n();
  const [key] = useState(() => crypto.randomUUID());
  return (
    <Dialog
      triggerVariant="primary"
      triggerSize="md"
      trigger={
        <>
          <Send className="size-4 rtl:-scale-x-100" aria-hidden />
          {dict.purchases.post}
        </>
      }
      title={dict.purchases.post}
      description={dict.purchases.postConfirm}
    >
      {(close) => (
        <form action={postBill} className="flex justify-end gap-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="idempotencyKey" value={key} />
          <Button type="button" variant="secondary" onClick={close}>
            {dict.common.cancel}
          </Button>
          <SubmitButton>{dict.purchases.post}</SubmitButton>
        </form>
      )}
    </Dialog>
  );
}

export function VoidBillDialog({ id }: { id: string }) {
  const { dict } = useI18n();
  return (
    <Dialog
      triggerVariant="ghost"
      triggerSize="md"
      trigger={
        <>
          <Ban className="size-4" aria-hidden />
          {dict.purchases.void}
        </>
      }
      title={dict.purchases.void}
      description={dict.purchases.voidBody}
    >
      {(close) => <VoidForm id={id} onCancel={close} />}
    </Dialog>
  );
}

function VoidForm({ id, onCancel }: { id: string; onCancel: () => void }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(voidBill);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={id} />
      <FormMessage tone="danger">{state.error}</FormMessage>
      <Field label={dict.invoices.voidReason} htmlFor="void-reason" error={errors.reason}>
        <Textarea id="void-reason" name="reason" maxLength={500} required dir="auto" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {dict.common.cancel}
        </Button>
        <SubmitButton variant="danger" pending={pending}>
          {dict.purchases.void}
        </SubmitButton>
      </div>
    </form>
  );
}

export function DeleteBillButton({ id }: { id: string }) {
  const { dict } = useI18n();
  return (
    <Dialog
      triggerVariant="ghost"
      triggerSize="md"
      trigger={
        <>
          <Trash2 className="size-4" aria-hidden />
          {dict.invoices.deleteDraft}
        </>
      }
      title={dict.invoices.deleteDraft}
      description={dict.invoices.deleteConfirm}
    >
      {(close) => (
        <form action={deleteBill} className="flex justify-end gap-2">
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
