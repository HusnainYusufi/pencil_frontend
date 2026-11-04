"use client";

import { Ban } from "lucide-react";
import { Dialog, SubmitButton } from "@/components/ui/interactive";
import { Button } from "@/components/ui/primitives";
import { useI18n } from "@/i18n/client";
import { voidSupplierPayment } from "../../bills/actions";

export function VoidSupplierPayment({ id }: { id: string }) {
  const { dict } = useI18n();
  return (
    <Dialog
      triggerVariant="ghost"
      triggerSize="md"
      trigger={
        <>
          <Ban className="size-4" aria-hidden />
          {dict.payments.void}
        </>
      }
      title={dict.payments.void}
      description={dict.payments.voidConfirm}
    >
      {(close) => (
        <form action={voidSupplierPayment} className="flex justify-end gap-2">
          <input type="hidden" name="id" value={id} />
          <Button type="button" variant="secondary" onClick={close}>
            {dict.common.cancel}
          </Button>
          <SubmitButton variant="danger">{dict.payments.void}</SubmitButton>
        </form>
      )}
    </Dialog>
  );
}
