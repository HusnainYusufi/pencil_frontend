import "server-only";
import type { Locale } from "@/i18n/config";
import { userApi, type Workspace } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { Account, Contact, Dimension, Page, TaxRate } from "@/lib/types";

/** Suppliers, tax rates, expense/asset accounts and paying accounts for purchase forms. */
export async function billFormOptions(ws: Workspace, locale: Locale) {
  const withCostCenters = ws.has(Feat.COST_CENTERS) && ws.can(Perm.ACCOUNTS_READ);
  const [contacts, rates, accounts, costCenters] = await Promise.all([
    ws.can(Perm.CONTACTS_READ) ? userApi<Page<Contact>>("/contacts", { query: { suppliers: true, pageSize: 100 } }) : null,
    userApi<TaxRate[]>("/tax-rates"),
    userApi<Account[]>("/accounts", { query: { postableOnly: true } }),
    withCostCenters ? userApi<Dimension[]>("/cost-centers") : Promise.resolve([] as Dimension[]),
  ]);
  const label = (a: Account) => `${a.code} · ${localName(a, locale)}`;
  const active = accounts.filter((a) => a.isActive);
  return {
    suppliers: (contacts?.items ?? []).map((c) => ({ id: c.id, label: localName(c, locale) })),
    taxRates: rates.map((r) => ({ id: r.id, label: localName(r, locale), rate: r.rate, isDefault: r.isDefault })),
    // Expenses, cost of sales, and assets bought (equipment, inventory, prepaid).
    accounts: active
      .filter((a) => a.type === "EXPENSE" || ["INVENTORY", "FIXED_ASSET", "OTHER_CURRENT_ASSET", "OTHER_NON_CURRENT_ASSET"].includes(a.subtype))
      .map((a) => ({ id: a.id, label: label(a) })),
    payingAccounts: active.filter((a) => a.subtype === "CASH" || a.subtype === "BANK").map((a) => ({ id: a.id, label: label(a) })),
    costCenters: costCenters.filter((c) => c.isActive).map((c) => ({ id: c.id, label: `${c.code} · ${localName(c, locale)}` })),
  };
}
