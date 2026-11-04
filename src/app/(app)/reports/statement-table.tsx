import Link from "next/link";
import { Amount } from "@/components/amount";
import { cn } from "@/components/ui/primitives";
import type { Locale } from "@/i18n/config";
import { localName } from "@/lib/format";
import type { StatementSection } from "@/lib/types";

/** One statement section: accounts, then its total (optionally with a comparison column). */
export function SectionRows({
  title,
  section,
  currency,
  locale,
  compare,
  linkAccounts,
}: {
  title: string;
  section: StatementSection;
  currency: string;
  locale: Locale;
  compare: boolean;
  linkAccounts: boolean;
}) {
  return (
    <>
      <tr>
        <td colSpan={compare ? 3 : 2} className="border-b border-line bg-surface-2/50 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-2">
          {title}
        </td>
      </tr>
      {section.lines.map((line) => (
        <tr key={line.accountId}>
          <td className="border-b border-line px-4 py-2 ps-8">
            {line.code && <span className="num me-2 font-mono text-[12px] text-muted">{line.code}</span>}
            {linkAccounts && line.code ? (
              <Link href={`/accounts/${line.accountId}`} className="hover:underline">
                {localName(line, locale)}
              </Link>
            ) : (
              localName(line, locale)
            )}
          </td>
          <td className="border-b border-line px-4 py-2 text-end tabular">
            <Amount value={line.amount} currency={currency} />
          </td>
          {compare && (
            <td className="border-b border-line px-4 py-2 text-end tabular text-ink-2">
              <Amount value={line.previous ?? "0"} currency={currency} />
            </td>
          )}
        </tr>
      ))}
      <TotalRow label="" value={section.total} previous={compare ? section.previousTotal : undefined} currency={currency} subtle />
    </>
  );
}

export function TotalRow({
  label,
  value,
  previous,
  currency,
  subtle = false,
}: {
  label: string;
  value: string;
  previous?: string;
  currency: string;
  subtle?: boolean;
}) {
  return (
    <tr className={cn(!subtle && "bg-surface-2/40")}>
      <td className={cn("border-b border-line px-4 py-2.5", subtle ? "text-muted" : "font-semibold")}>{label}</td>
      <td className={cn("border-b border-line px-4 py-2.5 text-end tabular", subtle ? "border-t border-line-strong" : "font-semibold")}>
        <Amount value={value} currency={currency} />
      </td>
      {previous !== undefined && (
        <td className={cn("border-b border-line px-4 py-2.5 text-end tabular text-ink-2", !subtle && "font-semibold")}>
          <Amount value={previous} currency={currency} />
        </td>
      )}
    </tr>
  );
}
