import { formatAmount } from "@/i18n/format";
import { cn } from "./ui/primitives";

/**
 * A money figure: grouped, padded to the currency's scale, isolated as LTR so
 * the sign and digits never reorder inside Arabic text. Zero renders muted
 * so real figures stand out in dense ledgers.
 */
export function Amount({
  value,
  currency,
  className,
  showCurrency = false,
  blankZero = false,
}: {
  value: string;
  currency: string;
  className?: string;
  showCurrency?: boolean;
  /** Render an empty cell instead of 0.00 (debit/credit columns). */
  blankZero?: boolean;
}) {
  const zero = !/[1-9]/.test(value);
  if (zero && blankZero) return null;
  return (
    <span className={cn("num", zero && "text-muted", className)}>
      {formatAmount(value, currency)}
      {showCurrency && <span className="ms-1 text-[0.8em] font-normal text-muted">{currency}</span>}
    </span>
  );
}
