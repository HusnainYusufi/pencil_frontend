"use client";

import { Badge } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import type { JournalSource, JournalStatus } from "@/lib/types";

export function JournalStatusBadge({ status, reversed = false }: { status: JournalStatus; reversed?: boolean }) {
  const { dict } = useI18n();
  if (reversed) return <Badge tone="neutral">{dict.journals.reversed}</Badge>;
  return status === "POSTED" ? (
    <Badge tone="success">{dict.journals.posted}</Badge>
  ) : (
    <Badge tone="warning">{dict.journals.draft}</Badge>
  );
}

export function JournalSourceLabel({ source }: { source: JournalSource }) {
  const { dict } = useI18n();
  const labels: Record<JournalSource, string> = {
    MANUAL: dict.journals.manual,
    OPENING_BALANCE: dict.journals.openingBalance,
    REVERSAL: dict.journals.reversal,
    CLOSING: dict.journals.closing,
  };
  return <span className="text-ink-2">{labels[source]}</span>;
}
