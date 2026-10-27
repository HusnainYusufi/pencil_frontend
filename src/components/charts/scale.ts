/** Clean integer y-scale for counts: 0 / 2 / 4, 0 / 5 / 10, 0 / 10 / 20 … */
export function countScale(max: number, targetTicks = 3): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 2, ticks: [0, 1, 2] };
  const rough = max / targetTicks;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, Math.ceil(([1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow)));
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return { max: top, ticks };
}

/** Column with a 4px rounded data-end and a square baseline. */
export function columnPath(x: number, top: number, width: number, height: number, radius = 4): string {
  if (height <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  return `M${x},${top + height}V${top + r}Q${x},${top} ${x + r},${top}H${x + width - r}Q${x + width},${top} ${x + width},${top + r}V${top + height}Z`;
}

/** Horizontal segment; `roundEnd` rounds the right data-end only. */
export function segmentPath(x: number, y: number, width: number, height: number, roundEnd: boolean, radius = 4): string {
  if (width <= 0) return "";
  if (!roundEnd) return `M${x},${y}H${x + width}V${y + height}H${x}Z`;
  const r = Math.min(radius, width, height / 2);
  return `M${x},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height - r}Q${x + width},${y + height} ${x + width - r},${y + height}H${x}Z`;
}

export const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
export const percent = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : "0%");
