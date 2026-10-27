"use client";

import { ColumnChart, type ColumnDatum } from "@/components/charts/column-chart";
import { ChartTable } from "@/components/charts/figures";
import { useI18n } from "@/i18n/client";

const whole = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

/** Single series (revenue) per month: one hue, no legend; the title names it. */
export function RevenueChart({ data, currency }: { data: ColumnDatum[]; currency: string }) {
  const { dict } = useI18n();
  return (
    <>
      <ColumnChart data={data} unit={currency} format={(v) => whole.format(v)} ariaLabel={dict.dashboard.monthlyRevenue} />
      <ChartTable
        caption={dict.dashboard.monthlyRevenue}
        headers={[dict.dashboard.month, `${dict.dashboard.revenue} (${currency})`]}
        rows={data.map((d) => [d.label, whole.format(d.value)])}
        toggleLabels={{ show: dict.common.viewTable, hide: dict.common.hideTable }}
      />
    </>
  );
}
