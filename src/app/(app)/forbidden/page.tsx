import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";

export const metadata: Metadata = { title: "403" };

export default async function ForbiddenPage({ searchParams }: PageProps<"/forbidden">) {
  const [{ dict, t }, params] = await Promise.all([getI18n(), searchParams]);
  const plan = params.reason === "plan";
  const features = dict.gate.features as Record<string, string>;
  const feature = typeof params.feature === "string" ? features[params.feature] : undefined;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-ink-2">
        <Lock className="size-5" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-[36px] leading-tight">
        <span className="mark">{plan ? dict.gate.notInPlanTitle : dict.gate.noPermissionTitle}</span>
      </h1>
      <p className="mt-3 text-ink-2">
        {plan
          ? feature
            ? t(dict.gate.notInPlanBody, { feature })
            : dict.errors.FEATURE_NOT_AVAILABLE
          : dict.gate.noPermissionBody}
      </p>
      <ButtonLink href="/" variant="secondary" className="mt-8">
        {dict.gate.backToDashboard}
      </ButtonLink>
    </div>
  );
}
