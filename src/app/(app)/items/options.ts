import "server-only";
import type { Locale } from "@/i18n/config";
import { userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import type { Account, TaxCode } from "@/lib/types";

/** Account and tax-code choices for the item form (server-side). */
export async function itemFormOptions(locale: Locale) {
  const [accounts, taxCodes] = await Promise.all([
    userApi<Account[]>("/accounts", { query: { postableOnly: true } }),
    userApi<TaxCode[]>("/tax-codes"),
  ]);
  const usable = accounts.filter((a) => a.isActive && a.allowManualPosting);
  const label = (a: { code: string | null; name: string; nameAr: string | null }) => `${a.code} · ${localName(a, locale)}`;
  const taxLabel = (t: TaxCode) => `${t.code} · ${localName(t, locale)}${t.currentRate !== null ? ` (${t.currentRate}%)` : ""}`;
  return {
    revenueAccounts: usable.filter((a) => a.type === "REVENUE").map((a) => ({ id: a.id, label: label(a) })),
    costAccounts: usable.filter((a) => a.type === "EXPENSE" || a.type === "ASSET").map((a) => ({ id: a.id, label: label(a) })),
    salesTaxCodes: taxCodes.filter((t) => t.kind === "SALES").map((t) => ({ id: t.id, label: taxLabel(t) })),
    purchaseTaxCodes: taxCodes.filter((t) => t.kind === "PURCHASE").map((t) => ({ id: t.id, label: taxLabel(t) })),
  };
}
