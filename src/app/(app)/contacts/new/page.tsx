import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { countryOptions } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { TaxCode } from "@/lib/types";
import { ContactForm } from "../contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.contacts.newContact };
}

export default async function NewContactPage() {
  const ws = await requireAccess({ feature: Feat.CONTACTS, permission: Perm.CONTACTS_MANAGE });
  const { dict, locale } = await getI18n();
  const withholding = ws.has(Feat.TAX_CODES) && ws.can(Perm.TAXES_READ) ? await userApi<TaxCode[]>("/tax-codes", { query: { kind: "WITHHOLDING" } }) : [];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/contacts" className="hover:text-ink">
            {dict.contacts.title}
          </Link>
        }
        title={dict.contacts.newContact}
      />
      <ContactForm companyCountry={ws.company.country} withholdingCodes={withholding} countries={countryOptions(locale)} />
    </div>
  );
}
