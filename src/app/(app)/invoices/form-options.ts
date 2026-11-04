import "server-only";
import type { Locale } from "@/i18n/config";
import { userApi, type Workspace } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { Account, Contact, Dimension, Page, TaxRate } from "@/lib/types";
import type { CustomerOption, Option, TaxOption } from "./invoice-form";

/** Everything the invoice form needs, filtered by plan and role. */
export async function invoiceFormOptions(ws: Workspace, locale: Locale) {
  const withCostCenters = ws.has(Feat.COST_CENTERS) && ws.can(Perm.ACCOUNTS_READ);
  const [contacts, rates, accounts, costCenters] = await Promise.all([
    ws.can(Perm.CONTACTS_READ) ? userApi<Page<Contact>>("/contacts", { query: { customers: true, pageSize: 100 } }) : null,
    userApi<TaxRate[]>("/tax-rates"),
    ws.can(Perm.ACCOUNTS_READ) ? userApi<Account[]>("/accounts", { query: { postableOnly: true } }) : Promise.resolve([] as Account[]),
    withCostCenters ? userApi<Dimension[]>("/cost-centers") : Promise.resolve([] as Dimension[]),
  ]);
  const customers: CustomerOption[] = (contacts?.items ?? []).map((c) => ({ id: c.id, label: localName(c, locale), type: c.type }));
  const taxRates: TaxOption[] = rates.map((r) => ({ id: r.id, label: localName(r, locale), rate: r.rate, isDefault: r.isDefault }));
  // Revenue (and deferred-revenue liabilities, e.g. school fees billed in advance).
  const revenue: Option[] = accounts
    .filter((a) => a.isActive && (a.type === "REVENUE" || a.subtype === "OTHER_CURRENT_LIABILITY"))
    .map((a) => ({ id: a.id, label: `${a.code} · ${localName(a, locale)}` }));
  return {
    customers,
    taxRates,
    accounts: revenue,
    costCenters: costCenters.filter((c) => c.isActive).map((c) => ({ id: c.id, label: `${c.code} · ${localName(c, locale)}` })),
  };
}
