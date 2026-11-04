"use client";

import { Ban, RotateCw, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Dialog, FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Button, Field, Textarea } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { deleteInvoice, issueInvoice, retryInvoice, voidInvoice } from "../actions";

export function IssueDialog({ id }: { id: string }) {
  const { dict } = useI18n();
  return (
    <Dialog
      triggerVariant="primary"
      triggerSize="md"
      trigger={
        <>
          <Send className="size-4 rtl:-scale-x-100" aria-hidden />
          {dict.invoices.issue}
        </>
      }
      title={dict.invoices.issue}
      description={dict.invoices.issueConfirm}
    >
      {(close) => <IssueForm id={id} onCancel={close} />}
    </Dialog>
  );
}

function IssueForm({ id, onCancel }: { id: string; onCancel: () => void }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit } = useActionForm(issueInvoice);
  const [key] = useState(() => crypto.randomUUID());
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="idempotencyKey" value={key} />
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {dict.common.cancel}
        </Button>
        <SubmitButton pending={pending}>{dict.invoices.issue}</SubmitButton>
      </div>
    </form>
  );
}

export function VoidDialog({ id }: { id: string }) {
  const { dict } = useI18n();
  return (
    <Dialog
      triggerVariant="ghost"
      triggerSize="md"
      trigger={
        <>
          <Ban className="size-4" aria-hidden />
          {dict.invoices.void}
        </>
      }
      title={dict.invoices.voidTitle}
      description={dict.invoices.voidBody}
    >
      {(close) => <VoidForm id={id} onCancel={close} />}
    </Dialog>
  );
}

function VoidForm({ id, onCancel }: { id: string; onCancel: () => void }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(voidInvoice);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={id} />
      <FormMessage tone="danger">{state.error}</FormMessage>
      <Field label={dict.invoices.voidReason} htmlFor="void-reason" error={errors.reason}>
        <Textarea id="void-reason" name="reason" minLength={3} maxLength={500} required dir="auto" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {dict.common.cancel}
        </Button>
        <SubmitButton variant="danger" pending={pending}>
          {dict.invoices.void}
        </SubmitButton>
      </div>
    </form>
  );
}

export function RetryButton({ id }: { id: string }) {
  const { dict } = useI18n();
  return (
    <form action={retryInvoice}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="secondary">
        <RotateCw className="size-4" aria-hidden />
        {dict.invoices.retry}
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
          {dict.invoices.deleteDraft}
        </>
      }
      title={dict.invoices.deleteDraft}
      description={dict.invoices.deleteConfirm}
    >
      {(close) => (
        <form action={deleteInvoice} className="flex justify-end gap-2">
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
