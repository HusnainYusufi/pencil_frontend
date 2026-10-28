"use client";

import { CheckCircle2, Plus, TriangleAlert, X } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/interactive";
import { Button, cn, Field, Input, Select } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { formatAmount, minorUnits } from "@/i18n/format";
import { fromMinor, toMinor } from "@/lib/money";
import { saveJournal } from "../actions";

export interface AccountOption {
  id: string;
  label: string;
  /** False for control accounts: offered only for opening balances. */
  manual?: boolean;
  /** Receivable / payable accounts: the line must name a customer / supplier. */
  party?: "customer" | "supplier";
}

export interface ContactOption {
  id: string;
  label: string;
  isCustomer: boolean;
  isSupplier: boolean;
}

interface Line {
  key: number;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
  costCenterId: string;
  contactId: string;
}

let lineSeq = 0;
const emptyLine = (): Line => ({ key: ++lineSeq, accountId: "", description: "", debit: "", credit: "", costCenterId: "", contactId: "" });
const AMOUNT_INPUT = /^[\d,]*\.?\d*$/;

export function JournalForm({
  accounts,
  costCenters,
  currency,
  today,
  openingBalanceDate,
  contacts,
}: {
  accounts: AccountOption[];
  /** Empty when the plan has no cost centers: the column is hidden. */
  costCenters: AccountOption[];
  currency: string;
  today: string;
  /** The company's cut-over date; opening balances are dated on it. */
  openingBalanceDate: string | null;
  contacts: ContactOption[];
}) {
  const { dict, t } = useI18n();
  const scale = minorUnits(currency);
  const [state, dispatch, pending] = useActionState(saveJournal, {});
  const [lines, setLines] = useState<Line[]>(() => [emptyLine(), emptyLine()]);
  const [intent, setIntent] = useState<"draft" | "post">("post");
  const [opening, setOpening] = useState(false);
  const [date, setDate] = useState(today);
  // Control accounts (receivables, payables, VAT) take opening balances, never manual journals.
  const selectable = opening ? accounts : accounts.filter((a) => a.manual !== false);
  const partyOf = (accountId: string) => accounts.find((a) => a.id === accountId)?.party;
  const withContacts = lines.some((l) => partyOf(l.accountId));
  const idempotencyKey = useRef<string>("");
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const focusLine = useRef<number | null>(null);

  // A new key per attempt that failed; the same key while a submit is in flight.
  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID();
  }, [state]);

  useEffect(() => {
    if (focusLine.current === null) return;
    tableRef.current?.querySelector<HTMLSelectElement>(`[data-line="${focusLine.current}"] select`)?.focus();
    focusLine.current = null;
  }, [lines.length]);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const addLine = () => {
    const line = emptyLine();
    focusLine.current = line.key;
    setLines((current) => [...current, line]);
  };

  const removeLine = (key: number) => setLines((current) => (current.length > 2 ? current.filter((l) => l.key !== key) : current));

  // Exact totals (BigInt minor units); a malformed amount counts as invalid, never as 0.
  const totals = lines.reduce(
    (acc, line) => {
      const debit = toMinor(line.debit, scale);
      const credit = toMinor(line.credit, scale);
      return {
        debit: acc.debit + (debit ?? 0n),
        credit: acc.credit + (credit ?? 0n),
        invalid: acc.invalid || debit === null || credit === null,
      };
    },
    { debit: 0n, credit: 0n, invalid: false },
  );
  const difference = totals.debit - totals.credit;
  const filled = lines.filter((l) => l.accountId && (l.debit || l.credit));
  const balanced = difference === 0n && totals.debit > 0n && !totals.invalid;
  const canPost = balanced && filled.length >= 2;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const chosen = submitter?.value === "draft" ? "draft" : "post";
    setIntent(chosen);
    const form = new FormData(event.currentTarget);
    const payload = {
      date: String(form.get("date") ?? ""),
      reference: String(form.get("reference") ?? ""),
      memo: String(form.get("memo") ?? ""),
      openingBalance: form.get("openingBalance") === "on",
      lines: lines
        .filter((l) => l.accountId || l.debit || l.credit || l.description)
        .map(({ accountId, description, debit, credit, costCenterId, contactId }) => ({ accountId, description, debit, credit, costCenterId, contactId })),
    };
    const data = new FormData();
    data.set("payload", JSON.stringify(payload));
    data.set("intent", chosen);
    data.set("idempotencyKey", idempotencyKey.current);
    startTransition(() => dispatch(data));
  };

  // Enter inside the lines grid adds a line instead of submitting (fast keyboard entry).
  const onLinesKeyDown = (event: KeyboardEvent<HTMLTableSectionElement>) => {
    if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") {
      event.preventDefault();
      addLine();
    }
  };

  const amountProps = (line: Line, side: "debit" | "credit") => {
    const other = side === "debit" ? "credit" : "debit";
    const invalid = toMinor(line[side], scale) === null;
    return {
      value: line[side],
      inputMode: "decimal" as const,
      dir: "ltr" as const,
      autoComplete: "off",
      placeholder: fromMinor(0n, scale),
      "aria-label": side === "debit" ? dict.journals.debit : dict.journals.credit,
      "aria-invalid": invalid,
      className: "h-9 w-36 text-end font-mono text-[13px] tabular",
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!AMOUNT_INPUT.test(value)) return;
        // A line is either a debit or a credit: typing one side clears the other.
        update(line.key, value ? { [side]: value, [other]: "" } : { [side]: value });
      },
      onBlur: () => {
        const minor = toMinor(line[side], scale);
        if (line[side] && minor !== null) update(line.key, { [side]: formatAmount(fromMinor(minor, scale), currency) });
      },
    };
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormMessage tone="danger">{state.error}</FormMessage>

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-card sm:grid-cols-[11rem_12rem_1fr]">
        <Field label={dict.journals.entryDate} htmlFor="date" error={state.fieldErrors?.date}>
          <Input
            id="date"
            name="date"
            type="date"
            value={opening && openingBalanceDate ? openingBalanceDate : date}
            onChange={(e) => setDate(e.target.value)}
            readOnly={opening && openingBalanceDate !== null}
            required
            aria-invalid={Boolean(state.fieldErrors?.date)}
          />
        </Field>
        <Field label={dict.journals.reference} htmlFor="reference" optional={dict.common.optional} error={state.fieldErrors?.reference}>
          <Input id="reference" name="reference" maxLength={100} dir="auto" />
        </Field>
        <Field label={dict.journals.memo} htmlFor="memo" optional={dict.common.optional} error={state.fieldErrors?.memo}>
          <Input id="memo" name="memo" maxLength={1000} dir="auto" />
        </Field>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:col-span-3">
          <label className="flex items-center gap-2.5 text-[13px] text-ink-2">
            <input
              type="checkbox"
              name="openingBalance"
              checked={opening}
              onChange={(e) => setOpening(e.target.checked)}
              className="size-4 accent-ink"
            />
            {dict.journals.isOpeningBalance}
          </label>
          {opening && (
            <p className={cn("text-[12.5px]", openingBalanceDate ? "text-muted" : "text-warning")}>
              {openingBalanceDate ? t(dict.journals.openingDateHint, { date: openingBalanceDate }) : dict.journals.openingDateMissing}
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start text-[13.5px]">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                <th scope="col" className="w-10 border-b border-line bg-surface-2/60 px-3 py-2.5 text-start font-medium">
                  #
                </th>
                <th scope="col" className="min-w-[16rem] border-b border-line bg-surface-2/60 px-2 py-2.5 text-start font-medium">
                  {dict.journals.account}
                </th>
                {withContacts && (
                  <th scope="col" className="min-w-[12rem] border-b border-line bg-surface-2/60 px-2 py-2.5 text-start font-medium">
                    {dict.journals.contact}
                  </th>
                )}
                <th scope="col" className="min-w-[12rem] border-b border-line bg-surface-2/60 px-2 py-2.5 text-start font-medium">
                  {dict.journals.lineDescription}
                </th>
                {costCenters.length > 0 && (
                  <th scope="col" className="min-w-[10rem] border-b border-line bg-surface-2/60 px-2 py-2.5 text-start font-medium">
                    {dict.journals.costCenter}
                  </th>
                )}
                <th scope="col" className="border-b border-line bg-surface-2/60 px-2 py-2.5 text-end font-medium">
                  {dict.journals.debit}
                </th>
                <th scope="col" className="border-b border-line bg-surface-2/60 px-2 py-2.5 text-end font-medium">
                  {dict.journals.credit}
                </th>
                <th scope="col" className="w-10 border-b border-line bg-surface-2/60" />
              </tr>
            </thead>
            <tbody ref={tableRef} onKeyDown={onLinesKeyDown}>
              {lines.map((line, index) => (
                <tr key={line.key} data-line={line.key} className="group">
                  <td className="border-b border-line px-3 py-1.5 font-mono text-[12px] text-muted">{index + 1}</td>
                  <td className="border-b border-line px-2 py-1.5">
                    <Select
                      value={line.accountId}
                      onChange={(e) => update(line.key, { accountId: e.target.value, contactId: "" })}
                      aria-label={dict.journals.account}
                      className="h-9 text-[13px]"
                    >
                      <option value="">{dict.journals.selectAccount}</option>
                      {selectable.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  {withContacts && (
                    <td className="border-b border-line px-2 py-1.5">
                      {partyOf(line.accountId) && (
                        <Select
                          value={line.contactId}
                          onChange={(e) => update(line.key, { contactId: e.target.value })}
                          aria-label={dict.journals.contact}
                          className="h-9 text-[13px]"
                        >
                          <option value="">{dict.journals.selectContact}</option>
                          {contacts
                            .filter((c) => (partyOf(line.accountId) === "customer" ? c.isCustomer : c.isSupplier))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                        </Select>
                      )}
                    </td>
                  )}
                  <td className="border-b border-line px-2 py-1.5">
                    <Input
                      value={line.description}
                      onChange={(e) => update(line.key, { description: e.target.value })}
                      maxLength={500}
                      dir="auto"
                      aria-label={dict.journals.lineDescription}
                      className="h-9 text-[13px]"
                    />
                  </td>
                  {costCenters.length > 0 && (
                    <td className="border-b border-line px-2 py-1.5">
                      <Select
                        value={line.costCenterId}
                        onChange={(e) => update(line.key, { costCenterId: e.target.value })}
                        aria-label={dict.journals.costCenter}
                        className="h-9 text-[13px]"
                      >
                        <option value="">—</option>
                        {costCenters.map((center) => (
                          <option key={center.id} value={center.id}>
                            {center.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  )}
                  <td className="border-b border-line px-2 py-1.5 text-end">
                    <Input {...amountProps(line, "debit")} />
                  </td>
                  <td className="border-b border-line px-2 py-1.5 text-end">
                    <Input {...amountProps(line, "credit")} />
                  </td>
                  <td className="border-b border-line px-1 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length <= 2}
                      aria-label={`${dict.journals.removeLine} ${index + 1}`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted opacity-0 transition-opacity duration-150 hover:bg-surface-2 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:invisible"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-2/40">
                <td colSpan={3 + (costCenters.length > 0 ? 1 : 0) + (withContacts ? 1 : 0)} className="px-3 py-3">
                  <Button type="button" variant="ghost" size="sm" onClick={addLine}>
                    <Plus className="size-4" aria-hidden />
                    {dict.journals.addLine}
                  </Button>
                </td>
                <td className="px-2 py-3 text-end font-mono text-[13px] font-semibold tabular">
                  <span className="num pe-3">{formatAmount(fromMinor(totals.debit, scale), currency)}</span>
                </td>
                <td className="px-2 py-3 text-end font-mono text-[13px] font-semibold tabular">
                  <span className="num pe-3">{formatAmount(fromMinor(totals.credit, scale), currency)}</span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className={cn("flex items-center gap-2 text-[13px]", balanced ? "text-success" : "text-warning")}>
          {/* Nothing entered yet: no verdict, just the hint. */}
          {(totals.debit > 0n || totals.credit > 0n || totals.invalid) && (
            <>
              {balanced ? <CheckCircle2 className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
              {balanced
                ? dict.journals.balanced
                : t(dict.journals.unbalanced, {
                    amount: `${formatAmount(fromMinor(difference < 0n ? -difference : difference, scale), currency)} ${currency}`,
                  })}
              <span className="hidden text-muted lg:inline">·</span>
            </>
          )}
          <span className="hidden text-muted lg:inline">{t(dict.journals.keyboardHint, { scale })}</span>
        </p>
        <div className="flex gap-2">
          <SubmitButton variant="secondary" pending={pending && intent === "draft"} value="draft">
            {dict.journals.saveDraft}
          </SubmitButton>
          <SubmitButton pending={pending && intent === "post"} disabled={!canPost || pending} value="post">
            {dict.journals.saveAndPost}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
