"use client";

import { CheckCircle2, Lock, LockOpen, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Amount } from "@/components/amount";
import { Dialog, FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Button, cn, Field, Input, Textarea } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import type { BooksOverview, YearEndPreview } from "@/lib/types";
import { closePeriod, closeYear, reopenPeriod, reopenYear, saveBooks } from "./actions";

/** Close a month. Errors (e.g. an earlier month still open) show inline. */
export function ClosePeriodButton({ id }: { id: string }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit } = useActionForm(closePeriod);
  return (
    <form onSubmit={onSubmit} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="secondary" size="sm" pending={pending}>
        <Lock className="size-3.5" aria-hidden />
        {dict.periods.close}
      </SubmitButton>
      {state.error && (
        <p role="alert" className="max-w-[14rem] text-end text-[12px] text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

function ReasonFields({ errors }: { errors: Record<string, string> }) {
  const { dict } = useI18n();
  return (
    <Field label={dict.common.reason} htmlFor="reason" hint={dict.common.reasonHint} error={errors.reason}>
      <Textarea id="reason" name="reason" required minLength={10} maxLength={500} dir="auto" aria-invalid={Boolean(errors.reason)} />
    </Field>
  );
}

export function ReopenPeriodDialog({ id, label }: { id: string; label: string }) {
  const { dict, t } = useI18n();
  return (
    <Dialog
      triggerVariant="secondary"
      trigger={
        <>
          <LockOpen className="size-3.5" aria-hidden />
          {dict.periods.reopen}
        </>
      }
      title={dict.periods.reopenPeriod}
      description={t(dict.periods.reopenPeriodBody, { period: label })}
    >
      {(close) => <ReasonForm id={id} action={reopenPeriod} submit={dict.periods.reopen} onDone={close} />}
    </Dialog>
  );
}

function ReasonForm({
  id,
  action,
  submit,
  onDone,
  danger = false,
}: {
  id: string;
  action: typeof reopenPeriod;
  submit: string;
  onDone: () => void;
  danger?: boolean;
}) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(action);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={id} />
      <FormMessage tone="danger">{state.error}</FormMessage>
      <ReasonFields errors={errors} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          {dict.common.cancel}
        </Button>
        <SubmitButton variant={danger ? "danger" : "primary"} pending={pending}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

function YearFigures({ preview }: { preview: YearEndPreview }) {
  const { dict } = useI18n();
  const loss = preview.profit.startsWith("-");
  return (
    <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line text-[13px]">
      {[
        [dict.periods.revenue, preview.revenue],
        [dict.periods.expenses, preview.expenses],
        [loss ? dict.periods.loss : dict.periods.profit, loss ? preview.profit.slice(1) : preview.profit],
      ].map(([label, value]) => (
        <div key={label} className="bg-surface px-3 py-2.5">
          <dt className="text-[12px] text-muted">{label}</dt>
          <dd className="mt-0.5 font-semibold">
            <Amount value={value!} currency={preview.currency} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Blockers({ preview }: { preview: YearEndPreview }) {
  const { dict, t } = useI18n();
  const messages = dict.periods.blockers as Record<string, string>;
  if (preview.blockers.length === 0) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-success">
        <CheckCircle2 className="size-4" aria-hidden />
        {dict.periods.readyToClose}
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {preview.blockers.map((blocker) => (
        <li key={blocker.code + (blocker.name ?? "")} className="flex items-start gap-2 text-[13px] text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t(messages[blocker.code] ?? blocker.message, {
            name: blocker.name ?? "",
            count: blocker.count ?? "",
            endDate: blocker.endDate ?? "",
            lockedThrough: blocker.lockedThrough ?? "",
          })}
        </li>
      ))}
    </ul>
  );
}

export function CloseYearDialog({ preview }: { preview: YearEndPreview }) {
  const { dict, t } = useI18n();
  return (
    <Dialog triggerVariant="primary" trigger={dict.periods.closeYear} title={t(dict.periods.closeYearTitle, { name: preview.name })} description={dict.periods.closeYearBody}>
      {(close) => <CloseYearForm preview={preview} onDone={close} />}
    </Dialog>
  );
}

function CloseYearForm({ preview, onDone }: { preview: YearEndPreview; onDone: () => void }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit } = useActionForm(closeYear);
  // One key per dialog: a double click or a retried request closes the year once.
  const [key] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="id" value={preview.yearId} />
      <input type="hidden" name="idempotencyKey" value={key} />
      <FormMessage tone="danger">{state.error}</FormMessage>
      <YearFigures preview={preview} />
      <Blockers preview={preview} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          {dict.common.cancel}
        </Button>
        <SubmitButton pending={pending} disabled={preview.blockers.length > 0}>
          {dict.periods.closeYear}
        </SubmitButton>
      </div>
    </form>
  );
}

export function ReopenYearDialog({ preview }: { preview: YearEndPreview }) {
  const { dict, t } = useI18n();
  return (
    <Dialog
      triggerVariant="secondary"
      trigger={dict.periods.reopenYear}
      title={t(dict.periods.reopenYearTitle, { name: preview.name })}
      description={dict.periods.reopenYearBody}
    >
      {(close) => (
        <div className="space-y-4">
          <YearFigures preview={preview} />
          {preview.blockers.length > 0 && <Blockers preview={preview} />}
          <ReasonForm id={preview.yearId} action={reopenYear} submit={dict.periods.reopenYear} onDone={close} danger />
        </div>
      )}
    </Dialog>
  );
}

export function YearResult({ preview }: { preview: YearEndPreview }) {
  return <YearFigures preview={preview} />;
}

/** Lock dates and the opening balance date; read-only for bookkeepers. */
export function BooksForm({ books, canEdit }: { books: BooksOverview; canEdit: boolean }) {
  const { dict } = useI18n();
  const { state, pending, onSubmit, errors } = useActionForm(saveBooks);
  const fields = [
    { name: "lockDate", label: dict.periods.lockDate, hint: dict.periods.lockDateHint, value: books.lockDate },
    { name: "taxLockDate", label: dict.periods.taxLockDate, hint: dict.periods.taxLockDateHint, value: books.taxLockDate },
    { name: "openingBalanceDate", label: dict.periods.openingBalanceDate, hint: dict.periods.openingBalanceDateHint, value: books.openingBalanceDate },
  ] as const;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>
      <FormMessage tone="success">{state.ok ? state.message : undefined}</FormMessage>
      <div className="grid gap-4 md:grid-cols-3">
        {fields.map((field) => (
          <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.hint} error={errors[field.name]}>
            <Input
              id={field.name}
              name={field.name}
              type="date"
              defaultValue={field.value ?? ""}
              disabled={!canEdit}
              aria-invalid={Boolean(errors[field.name])}
            />
          </Field>
        ))}
      </div>
      {canEdit ? (
        <div className="grid items-end gap-4 md:grid-cols-[1fr_auto]">
          <Field label={dict.common.reason} htmlFor="books-reason" optional={dict.common.optional} hint={dict.periods.reasonRequired} error={errors.reason}>
            <Input id="books-reason" name="reason" maxLength={500} dir="auto" aria-invalid={Boolean(errors.reason)} />
          </Field>
          <SubmitButton pending={pending} className={cn("md:mb-6")}>
            {dict.periods.saveControls}
          </SubmitButton>
        </div>
      ) : (
        <p className="text-[12.5px] text-muted">{dict.periods.ownersOnly}</p>
      )}
    </form>
  );
}
