"use client";

import { Button } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict } = useI18n();
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <h1 className="font-display text-[36px] leading-tight">
        <span className="mark">{dict.common.errorTitle}</span>
      </h1>
      <p className="mt-3 text-ink-2">{dict.common.errorBody}</p>
      {error.digest && (
        <p className="mt-4 font-mono text-[12px] text-muted" dir="ltr">
          ref {error.digest}
        </p>
      )}
      <Button variant="secondary" className="mt-8" onClick={reset}>
        {dict.common.retry}
      </Button>
    </div>
  );
}
