/** API payload shapes (mirrors of pencil_backend responses). Money is always a decimal string. */

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface CompanySummary {
  id: string;
  slug: string;
  legalName: string;
  tradeName: string | null;
  country: "SA" | "JO";
  baseCurrency: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  role: { key: string; name: string };
}

export interface Me {
  user: { id: string; email: string; fullName: string; locale: string; emailVerified: boolean };
  activeTenant: CompanySummary | null;
  permissions: string[];
  plan: string | null;
  entitlements: Record<string, { enabled: boolean; limit: number | null }>;
  tenants: CompanySummary[];
}

export const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Categories per type, in statement order (mirror of the backend's AccountSubtype). */
export const SUBTYPES_BY_TYPE: Record<AccountType, readonly string[]> = {
  ASSET: [
    "CASH",
    "BANK",
    "ACCOUNTS_RECEIVABLE",
    "INVENTORY",
    "TAX_RECEIVABLE",
    "OTHER_CURRENT_ASSET",
    "FIXED_ASSET",
    "ACCUMULATED_DEPRECIATION",
    "OTHER_NON_CURRENT_ASSET",
  ],
  LIABILITY: ["ACCOUNTS_PAYABLE", "TAX_PAYABLE", "OTHER_CURRENT_LIABILITY", "NON_CURRENT_LIABILITY"],
  EQUITY: ["EQUITY", "RETAINED_EARNINGS"],
  REVENUE: ["OPERATING_REVENUE", "OTHER_REVENUE"],
  EXPENSE: ["COST_OF_SALES", "OPERATING_EXPENSE", "OTHER_EXPENSE"],
};

export interface Account {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  type: AccountType;
  subtype: string;
  isGroup: boolean;
  systemKey: string | null;
  isActive: boolean;
}

export interface AccountRef {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
}

export type JournalStatus = "DRAFT" | "POSTED";
export type JournalSource = "MANUAL" | "OPENING_BALANCE" | "REVERSAL";

export interface JournalSummary {
  id: string;
  number: string | null;
  date: string;
  status: JournalStatus;
  source: JournalSource;
  reference: string | null;
  memo: string | null;
  currency: string;
  totalAmount: string;
  reversalOfId: string | null;
  postedAt: string | null;
  createdAt: string;
}

export interface JournalLink {
  id: string;
  number: string | null;
  date: string;
}

export interface JournalDetail extends JournalSummary {
  exchangeRate: string;
  fiscalPeriodId: string | null;
  updatedAt: string;
  reversalOf: JournalLink | null;
  reversedBy: JournalLink | null;
  lines: Array<{
    id: string;
    lineNo: number;
    account: AccountRef;
    description: string | null;
    debit: string;
    credit: string;
    branch: { id: string; code: string; name: string } | null;
    costCenter: { id: string; code: string; name: string } | null;
  }>;
}

export interface Dimension {
  id: string;
  code: string;
  name: string;
  nameAr?: string | null;
  isActive: boolean;
}

export interface DebitCredit {
  debit: string;
  credit: string;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  nameAr: string | null;
  type: AccountType;
  parentId: string | null;
  isGroup: boolean;
  depth: number;
  opening: DebitCredit;
  movement: DebitCredit;
  closing: DebitCredit;
}

export interface TrialBalance {
  from: string;
  to: string;
  currency: string;
  rows: TrialBalanceRow[];
  totals: { opening: DebitCredit; movement: DebitCredit; closing: DebitCredit };
  balanced: boolean;
}

export interface AccountStatement {
  account: AccountRef & { type: AccountType };
  from: string;
  to: string;
  currency: string;
  openingBalance: string;
  closingBalance: string;
  items: Array<{
    id: string;
    date: string;
    journalEntryId: string;
    number: string;
    source: JournalSource;
    reference: string | null;
    description: string | null;
    debit: string;
    credit: string;
    balance: string;
  }>;
  nextCursor: string | null;
}

export interface FiscalPeriod {
  id: string;
  number: number;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
  closedAt: string | null;
}

export interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
  periods: FiscalPeriod[];
}
