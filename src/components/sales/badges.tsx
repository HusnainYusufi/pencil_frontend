"use client";

import { Badge, type Tone } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import type { EInvoiceStatus, SalesInvoiceStatus } from "@/lib/types";

const STATUS_TONE: Record<SalesInvoiceStatus, Tone> = { DRAFT: "warning", ISSUED: "success", VOID: "neutral" };
const EINVOICE_TONE: Record<EInvoiceStatus, Tone> = { PENDING: "warning", CLEARED: "success", REPORTED: "success", REJECTED: "danger" };

export function InvoiceStatusBadge({ status }: { status: SalesInvoiceStatus }) {
  const { dict } = useI18n();
  return <Badge tone={STATUS_TONE[status]}>{dict.invoices.statuses[status]}</Badge>;
}

export function EInvoiceBadge({ status }: { status: EInvoiceStatus | null }) {
  const { dict } = useI18n();
  if (!status) return <span className="text-[12px] text-muted">—</span>;
  return <Badge tone={EINVOICE_TONE[status]}>{dict.invoices.einvoiceStatuses[status]}</Badge>;
}
