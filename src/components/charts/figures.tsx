import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/primitives";

/**
 * Stat tile contract (dataviz): label · value (sans, proportional figures,
 * never mono at display size) · delta (signed, vs a named period, colour =
 * direction × whether up is good) · optional trend or meter.
 */
export function StatTile({
  label,
  value,
  delta,
  children,
  footnote,
}: {
  label: string;
  value: ReactNode;
  delta?: { value: number; period: string; upIsGood?: boolean };
  children?: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <div className="flex min-h-[132px] flex-col px-5 py-4">
      <p className="text-[12.5px] text-muted">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-[30px] font-semibold leading-none tracking-[-0.01em] text-ink">{value}</p>
        {children}
      </div>
      <div className="mt-auto pt-3 text-[12px]">
        {delta ? <Delta {...delta} /> : footnote && <span className="text-muted">{footnote}</span>}
      </div>
    </div>
  );
}

export function Delta({ value, period, upIsGood = true }: { value: number; period: string; upIsGood?: boolean }) {
  const good = value === 0 ? null : value > 0 === upIsGood;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-flex items-center gap-0.5 font-medium", good === null ? "text-muted" : good ? "text-success" : "text-danger")}>
        <Icon className="size-3.5" aria-hidden />
        {value > 0 ? `+${value}` : value}
      </span>
      <span className="text-muted">{period}</span>
    </span>
  );
}

/**
 * 12-ish point trend in the de-emphasis hue; the current period (last point)
 * in the accent with a 2px surface ring. Decorative next to the value: the
 * tile's number and delta carry the information.
 */
export function Sparkline({ values }: { values: number[] }) {
  const w = 96;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (w - 6) + 3, h - 4 - ((v - min) / span) * (h - 8)] as const);
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const last = pts[pts.length - 1]!;
  const prev = pts[pts.length - 2] ?? last;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-24 shrink-0 overflow-visible" aria-hidden>
      <path d={path} fill="none" className="stroke-chart-axis" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${prev[0]},${prev[1]}L${last[0]},${last[1]}`} className="stroke-series-1" strokeWidth={2} strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={4} className="fill-series-1 stroke-surface" strokeWidth={2} />
    </svg>
  );
}

/** Meter: share of a whole. Track is a lighter step of the fill's own hue. */
const METER_TONES = {
  series: { track: "fill-series-1/20", fill: "fill-series-1" },
  warning: { track: "fill-status-warning/25", fill: "fill-status-warning" },
  ink: { track: "fill-ink/10", fill: "fill-ink" },
} as const;

export function Meter({ value, max, label, tone = "series" }: { value: number; max: number; label: string; tone?: keyof typeof METER_TONES }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-1.5 w-full overflow-hidden rounded-full" role="img" aria-label={label}>
      <rect x={0} y={0} width={100} height={6} className={METER_TONES[tone].track} />
      <rect x={0} y={0} width={ratio * 100} height={6} className={METER_TONES[tone].fill} />
    </svg>
  );
}

/** Every chart's accessible twin: the same numbers as a plain table. */
export function ChartTable({
  caption,
  headers,
  rows,
  toggleLabels = { show: "View as table", hide: "Hide table" },
}: {
  caption: string;
  headers: string[];
  rows: Array<Array<ReactNode>>;
  toggleLabels?: { show: string; hide: string };
}) {
  return (
    <details className="group mt-4 border-t border-line pt-3">
      <summary className="cursor-pointer list-none text-[12.5px] text-muted hover:text-ink">
        <span className="group-open:hidden">{toggleLabels.show}</span>
        <span className="hidden group-open:inline">{toggleLabels.hide}</span>
      </summary>
      <div className="mt-3 max-h-64 overflow-auto">
        <table className="w-full text-start text-[12.5px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={h} scope="col" className={cn("border-b border-line pb-1.5 font-medium text-muted", i > 0 && "text-end")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) => (
                  <td key={i} className={cn("border-b border-line/60 py-1.5", i > 0 && "text-end tabular")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
