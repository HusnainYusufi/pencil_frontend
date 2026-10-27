import clsx, { type ClassValue } from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cn = (...classes: ClassValue[]) => clsx(classes);

/* ── Buttons ─────────────────────────────────────────────────────────── */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow] duration-150 " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-bg hover:bg-ink/88 shadow-[inset_0_-1px_0_oklch(0_0_0/0.2)]",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-surface hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(buttonBase, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ── Badges ──────────────────────────────────────────────────────────── */

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2 ring-line",
  success: "bg-success-bg text-success ring-success/25",
  warning: "bg-warning-bg text-warning ring-warning/25",
  danger: "bg-danger-bg text-danger ring-danger/25",
  info: "bg-info-bg text-info ring-info/25",
  accent: "bg-accent text-accent-ink ring-accent-ink/10",
};

export function Badge({ tone = "neutral", children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset",
        tones[tone],
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

/* ── Layout ──────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{eyebrow}</p>
        )}
        <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-ink">
          <span className="mark">{title}</span>
        </h1>
        {description && <p className="mt-3 max-w-2xl text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  flush = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No body padding (tables). */
  flush?: boolean;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-surface shadow-card", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div>
            {title && <h2 className="text-[13px] font-semibold tracking-wide text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? undefined : "p-5"}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div aria-hidden className="mb-4 h-px w-16 bg-line-strong" />
      <p className="font-display text-2xl text-ink">{title}</p>
      {children && <p className="mt-2 max-w-sm text-ink-2">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Label/value pairs in a ledger-style list. */
export function DataList({ items }: { items: Array<{ label: string; value: ReactNode; mono?: boolean }> }) {
  return (
    <dl className="hairline-grid">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-[13px] text-muted">{item.label}</dt>
          <dd className={cn("min-w-0 break-words text-ink", item.mono && "font-mono text-[13px]")}>{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Tables ──────────────────────────────────────────────────────────── */

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-start text-[13.5px]">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  align,
  plain,
}: {
  children?: ReactNode;
  className?: string;
  align?: "right";
  /** Rich header content (e.g. plan columns): skip the mono caps label style. */
  plain?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line bg-surface-2/60 px-4 py-2.5 text-muted",
        plain ? "font-normal" : "font-mono text-[11px] font-medium uppercase tracking-[0.1em]",
        align === "right" && "text-end",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align,
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  /** Numeric column: aligned to the end edge (right in English, left in Arabic). */
  align?: "right";
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("border-b border-line px-4 py-3 align-middle", align === "right" && "text-end tabular", className)}>
      {children}
    </td>
  );
}

/* ── Forms ───────────────────────────────────────────────────────────── */

const control =
  "block w-full rounded-md border border-line-strong bg-surface px-3 text-ink placeholder:text-muted " +
  "transition-[border-color,box-shadow] duration-150 hover:border-ink-2/40 " +
  "focus:border-focus focus:outline-none focus:ring-3 focus:ring-focus/25 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-10 pe-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  optional,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  /** The localised "Optional" label, when the field is optional. */
  optional?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-[13px] font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-muted">{optional}</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[12.5px] text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-[12.5px] text-muted">{hint}</p>
      )}
    </div>
  );
}

/**
 * Toggle switch. A native checkbox with role="switch", so it works inside
 * plain forms (no JS), is keyboard/screen-reader correct and needs no
 * inline styles (strict CSP).
 */
export function Toggle({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      role="switch"
      className={cn(
        "relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors duration-150",
        "before:absolute before:start-0.5 before:top-0.5 before:size-4 before:rounded-full before:bg-surface before:shadow-sm before:transition-transform before:duration-150",
        "checked:bg-ink checked:before:translate-x-4 rtl:checked:before:-translate-x-4",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
      {children}
    </kbd>
  );
}
