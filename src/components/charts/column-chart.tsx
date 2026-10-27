"use client";

import { useState } from "react";
import { cn } from "@/components/ui/primitives";
import { columnPath, compact, countScale } from "./scale";
import { ChartTooltip } from "./tooltip";
import { useWidth } from "./use-width";

export interface ColumnDatum {
  key: string;
  /** Full label for tooltip / table, e.g. "Tue 27 Oct". */
  label: string;
  /** Short axis label, e.g. "27 Oct". */
  tick: string;
  value: number;
}

const M = { top: 22, right: 4, bottom: 26, left: 30 };

/**
 * Single-series column chart (magnitude over time). Thin columns (≤ 24px)
 * from one baseline, hairline grid, clean integer ticks, selective direct
 * labels (peak + latest), and a per-column tooltip on hover AND focus:
 * each column's full band is its hit target.
 */
export function ColumnChart({
  data,
  unit,
  height = 200,
  colorClass = "fill-series-1",
  keyClass = "bg-series-1",
  ariaLabel,
  format = String,
}: {
  data: ColumnDatum[];
  unit: string;
  height?: number;
  colorClass?: string;
  keyClass?: string;
  ariaLabel?: string;
  /** Value formatter for labels and tooltips (e.g. grouped money). */
  format?: (value: number) => string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>(640);
  const [active, setActive] = useState<number | null>(null);

  const plotW = width - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const { max, ticks } = countScale(Math.max(0, ...data.map((d) => d.value)));
  const y = (v: number) => M.top + plotH - (v / max) * plotH;
  const band = plotW / Math.max(1, data.length);
  const barW = Math.min(24, Math.max(3, band * 0.62));
  const barX = (i: number) => M.left + i * band + (band - barW) / 2;

  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? 0) ? i : best), 0);
  const labelled = new Set([peak, data.length - 1].filter((i) => (data[i]?.value ?? 0) > 0));
  const tickEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotW / 72))));

  return (
    // Geometry is computed left-to-right; pin the direction so RTL pages
    // don't flip tooltip anchoring. Time reads left-to-right in both locales.
    <div ref={ref} dir="ltr" className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={ariaLabel ?? `Column chart of ${unit}`}
        onPointerLeave={() => setActive(null)}
      >
        {/* Recessive grid: solid hairlines, clean ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={t === 0 ? "stroke-chart-axis" : "stroke-chart-grid"} strokeWidth={1} shapeRendering="crispEdges" />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted font-mono text-[10.5px] tabular">
              {compact(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => (
          <path
            key={d.key}
            d={columnPath(barX(i), y(d.value), barW, y(0) - y(d.value))}
            className={cn(colorClass, "transition-opacity duration-150", active !== null && active !== i && "opacity-35")}
          />
        ))}

        {/* Selective direct labels: value on the cap of the peak and the latest day. */}
        {[...labelled].map((i) => (
          <text key={`l${i}`} x={barX(i) + barW / 2} y={y(data[i]!.value) - 6} textAnchor="middle" className="fill-ink text-[11px] font-medium tabular">
            {format(data[i]!.value)}
          </text>
        ))}

        {data.map((d, i) =>
          i % tickEvery === 0 || i === data.length - 1 ? (
            <text key={`t${d.key}`} x={barX(i) + barW / 2} y={height - 6} textAnchor="middle" className="fill-muted font-mono text-[10.5px]">
              {d.tick}
            </text>
          ) : null,
        )}

        {/* Hit targets: the whole band, keyboard focusable. */}
        {data.map((d, i) => (
          <rect
            key={`h${d.key}`}
            x={M.left + i * band}
            y={M.top}
            width={band}
            height={plotH}
            fill="transparent"
            tabIndex={0}
            aria-label={`${d.label}: ${format(d.value)} ${unit}`}
            className="cursor-default outline-none focus-visible:stroke-focus"
            strokeWidth={1.5}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        ))}
      </svg>

      {active !== null && data[active] && (
        <ChartTooltip
          x={barX(active) + barW / 2}
          // Sit above the cap's direct label, never on top of it.
          y={Math.min(y(data[active].value), y(0)) - (labelled.has(active) ? 20 : 4)}
          value={`${format(data[active].value)} ${unit}`}
          label={data[active].label}
          keyClass={keyClass}
          align={active < 3 ? "start" : active > data.length - 4 ? "end" : "center"}
        />
      )}
    </div>
  );
}
