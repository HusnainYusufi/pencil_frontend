import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { isoDate, localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { Account, Dimension } from "@/lib/types";
import { JournalForm } from "./journal-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.journals.newEntry };
}

export default async function NewJournalPage() {
  const ws = await requireAccess({ feature: Feat.JOURNALS, permission: Perm.JOURNALS_POST });
  const { dict, locale } = await getI18n();
  const withCostCenters = ws.has(Feat.COST_CENTERS) && ws.can(Perm.ACCOUNTS_READ);

  const [accounts, costCenters] = await Promise.all([
    userApi<Account[]>("/accounts", { query: { postableOnly: true } }),
    withCostCenters ? userApi<Dimension[]>("/cost-centers") : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/journals" className="hover:text-ink">
            {dict.journals.title}
          </Link>
        }
        title={dict.journals.newEntry}
        description={dict.journals.subtitle}
      />
      <JournalForm
        accounts={accounts.filter((a) => a.isActive).map((a) => ({ id: a.id, label: `${a.code} · ${localName(a, locale)}` }))}
        costCenters={costCenters.filter((c) => c.isActive).map((c) => ({ id: c.id, label: `${c.code} · ${localName(c, locale)}` }))}
        currency={ws.company.baseCurrency}
        today={isoDate(requestNow())}
      />
    </div>
  );
}
