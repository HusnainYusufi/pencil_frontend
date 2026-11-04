import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { Perm } from "@/lib/permissions";
import type { CompanyProfile } from "@/lib/types";
import { CompanyForm } from "./company-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.companyProfile.title };
}

export default async function CompanyPage() {
  const ws = await requireAccess({ permission: Perm.TENANT_READ });
  const [{ dict }, company] = await Promise.all([getI18n(), userApi<CompanyProfile>("/tenant")]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={dict.nav.settings} title={dict.companyProfile.title} description={dict.companyProfile.subtitle} />
      <CompanyForm company={company} readOnly={!ws.can(Perm.TENANT_MANAGE)} />
    </div>
  );
}
