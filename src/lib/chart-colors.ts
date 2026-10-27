/**
 * Categorical identity for charts and chips. Colour follows the ENTITY (plan
 * code / country), never its rank in the current view, and slots are taken in
 * fixed order. Past three series the tail folds into "Other": only the first
 * three slots are validated all-pairs against our surfaces.
 *
 * Class names are literal so Tailwind can see them.
 */
export interface SeriesColor {
  fill: string;
  bg: string;
  stroke: string;
}

const SLOTS: SeriesColor[] = [
  { fill: "fill-series-1", bg: "bg-series-1", stroke: "stroke-series-1" },
  { fill: "fill-series-2", bg: "bg-series-2", stroke: "stroke-series-2" },
  { fill: "fill-series-3", bg: "bg-series-3", stroke: "stroke-series-3" },
];

export const OTHER_COLOR: SeriesColor = { fill: "fill-series-other", bg: "bg-series-other", stroke: "stroke-series-other" };

/** `orderedKeys` must be a stable order (e.g. plans by sortOrder), not by value. */
export function seriesColor(key: string, orderedKeys: readonly string[]): SeriesColor {
  const index = orderedKeys.indexOf(key);
  return index >= 0 && index < SLOTS.length ? SLOTS[index]! : OTHER_COLOR;
}

/** Fixed country order: identity, not size. */
export const COUNTRY_ORDER = ["SA", "JO"] as const;

/** Status palette (state, not identity). Always rendered with an icon + label. */
export const STATUS_FILL = {
  good: "fill-status-good",
  warning: "fill-status-warning",
  serious: "fill-status-serious",
  critical: "fill-status-critical",
  neutral: "fill-series-other",
} as const;

export const STATUS_BG = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  serious: "bg-status-serious",
  critical: "bg-status-critical",
  neutral: "bg-series-other",
} as const;
