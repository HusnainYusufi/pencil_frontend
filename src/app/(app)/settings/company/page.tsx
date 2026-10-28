import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { Perm } from "@/lib/permissions";
import type { TaxProfile } from "@/lib/types";
import { TaxProfileForm } from "./profile-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.companyTax.title };
}

export default async function CompanyTaxPage() {
  const ws = await requireAccess({ permission: Perm.TENANT_READ });
  const { dict } = await getI18n();
  const ct = dict.companyTax;
  const profile = await userApi<TaxProfile>("/tax-profile");
  const missing = dict.contacts.missing as Record<string, string>;
  const fieldLabel = (field: string) => (dict.contacts as Record<string, unknown>)[field] as string | undefined;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={dict.nav.settings} title={ct.title} description={ct.subtitle} />

      <Card title={ct.readiness}>
        {profile.einvoiceReadiness.ready ? (
          <p className="flex items-center gap-2 text-[13.5px] text-success">
            <CheckCircle2 className="size-4" aria-hidden />
            {ct.ready}
          </p>
        ) : (
          <div className="flex items-start gap-2 text-[13.5px] text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              {ct.missing}
              <ul className="mt-1 list-disc ps-5 text-ink-2">
                {profile.einvoiceReadiness.missing.map((field) => (
                  <li key={field}>{missing[field] ?? fieldLabel(field) ?? field}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>

      <TaxProfileForm profile={profile} canEdit={ws.can(Perm.TAXES_MANAGE)} />
    </div>
  );
}
