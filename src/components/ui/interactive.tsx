"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useI18n } from "@/i18n/client";
import type { ActionState } from "@/lib/actions";
import { Button, cn, type Tone } from "./primitives";

/**
 * Runs a Server Action from a form WITHOUT React's automatic form reset, so
 * a failed submission (validation error, wrong password) keeps everything
 * the user typed. Pass `pending` to <SubmitButton>.
 */
export function useActionForm(action: (state: ActionState, form: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(action, {});
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { state, pending, onSubmit, errors: state.fieldErrors ?? {} };
}

/** Submit button showing a pending state (explicit `pending`, else the parent form's). */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  pending: pendingProp,
  disabled,
  value,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  className?: string;
  pending?: boolean;
  disabled?: boolean;
  /** Identifies the submitter when a form has several intents (read via SubmitEvent.submitter). */
  value?: string;
}) {
  const status = useFormStatus();
  const { dict } = useI18n();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending || disabled} aria-busy={pending} value={value} className={className}>
      {pending && (
        <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {pending ? (pendingLabel ?? dict.common.working) : children}
    </Button>
  );
}

/** Result banner for a Server Action (role=status so screen readers announce it). */
export function FormMessage({ tone, children }: { tone: Extract<Tone, "danger" | "success">; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-md px-3 py-2 text-[13px]",
        tone === "danger" ? "bg-danger-bg text-danger" : "bg-success-bg text-success",
      )}
    >
      {children}
    </p>
  );
}

/**
 * Accessible modal built on the native <dialog> (focus trap, Esc, inert
 * background for free). `open` is controlled by the trigger; children get
 * a `close` callback (e.g. after a successful action).
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
  triggerVariant = "secondary",
  triggerSize = "sm",
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  children: (close: () => void) => ReactNode;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger";
  triggerSize?: "sm" | "md";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === ref.current) setOpen(false); // backdrop click
        }}
        aria-labelledby={titleId}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-card backdrop:bg-ink/35 backdrop:backdrop-blur-[2px]"
      >
        {open && (
          <div className="p-6">
            <h2 id={titleId} className="font-display text-[28px] leading-tight">
              {title}
            </h2>
            {description && <p className="mt-1.5 text-ink-2">{description}</p>}
            <div className="mt-5">{children(() => setOpen(false))}</div>
          </div>
        )}
      </dialog>
    </>
  );
}
