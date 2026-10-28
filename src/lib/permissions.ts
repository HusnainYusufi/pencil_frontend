/** Same matching rules as the API: exact, `*`, or a `resource.*` grant. */
export function hasPermission(granted: readonly string[], required: string): boolean {
  if (granted.includes("*") || granted.includes(required)) return true;
  const parts = required.split(".");
  for (let i = parts.length - 1; i > 0; i--) {
    if (granted.includes(`${parts.slice(0, i).join(".")}.*`)) return true;
  }
  return false;
}

/** Tenant permission keys (mirror of pencil_backend modules/access/permissions.ts). */
export const Perm = {
  TENANT_READ: "tenant.read",
  TENANT_MANAGE: "tenant.manage",
  ACCOUNTS_READ: "accounts.read",
  ACCOUNTS_MANAGE: "accounts.manage",
  JOURNALS_READ: "journals.read",
  JOURNALS_POST: "journals.post",
  PERIODS_MANAGE: "periods.manage",
  /** Year-end close / reopen, lock dates, opening balance date (owners and admins). */
  BOOKS_CLOSE: "books.close",
  REPORTS_READ: "reports.read",
  CONTACTS_READ: "contacts.read",
  CONTACTS_MANAGE: "contacts.manage",
  ITEMS_READ: "items.read",
  ITEMS_MANAGE: "items.manage",
  TAXES_READ: "taxes.read",
  /** Tax codes and the company tax profile (owners and admins). */
  TAXES_MANAGE: "taxes.manage",
} as const;

/** Feature keys the app checks (mirror of the backend catalog). */
export const Feat = {
  CHART_OF_ACCOUNTS: "accounting.chart_of_accounts",
  JOURNALS: "accounting.journals",
  FISCAL_PERIODS: "accounting.fiscal_periods",
  COST_CENTERS: "accounting.cost_centers",
  LEDGER_REPORTS: "reports.ledger",
  CONTACTS: "accounting.contacts",
  ITEMS: "sales.items",
  TAX_CODES: "tax.codes",
} as const;
