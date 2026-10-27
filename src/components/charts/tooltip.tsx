"use client";

import type { ReactNode } from "react";
import { cn } from "@/components/ui/primitives";

/**
 * Chart tooltip: value leads (strong), label follows (secondary); a short
 * line-key in the series colour carries identity. Rendered client-side only
 * after hover/focus, so its position is set through the CSSOM (allowed by
 * the strict CSP; no style attribute is ever server-rendered).
 */
export function ChartTooltip({
  x,
  y,
  value,
  label,
  keyClass,
  align = "center",
}: {
  x: number;
  y: number;
  value: ReactNode;
  label: ReactNode;
  keyClass?: string;
  align?: "center" | "start" | "end";
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-md border border-line bg-surface px-3 py-2 shadow-card",
        align === "center" && "-translate-x-1/2",
        align === "end" && "-translate-x-full",
      )}
      style={{ left: x, top: y - 8 }}
    >
      <div className="flex items-center gap-2">
        {keyClass && <span aria-hidden className={cn("h-0.5 w-3 rounded-full", keyClass)} />}
        <span className="text-[15px] font-semibold text-ink">{value}</span>
      </div>
      <div className="mt-0.5 text-[12px] text-muted">{label}</div>
    </div>
  );
}
