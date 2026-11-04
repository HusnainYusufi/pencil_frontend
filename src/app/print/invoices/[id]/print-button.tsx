"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
