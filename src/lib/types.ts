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
  /** False for control accounts (receivables, payables, VAT): documents only. */
  allowManualPosting: boolean;
}

export interface AccountRef {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
}

export type JournalStatus = "DRAFT" | "POSTED";
export type JournalSource = "MANUAL" | "OPENING_BALANCE" | "REVERSAL" | "CLOSING";

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
    contact: Ref | null;
    taxCode: Ref | null;
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
  includeClosing: boolean;
  /** Result of earlier years never closed, carried in retained earnings' opening. */
  unclosedPriorResult: string;
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
  unclosedPriorResult: string | null;
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
  closedAt: string | null;
  closingEntryId: string | null;
  periods: FiscalPeriod[];
}

export type YearEndBlockerCode =
  | "YEAR_CLOSED"
  | "YEAR_OPEN"
  | "YEAR_NOT_ENDED"
  | "EARLIER_YEAR_OPEN"
  | "LATER_YEAR_CLOSED"
  | "DRAFTS_IN_YEAR"
  | "BOOKS_LOCKED"
  | "NO_RETAINED_EARNINGS";

export interface YearEndPreview {
  yearId: string;
  name: string;
  status: "OPEN" | "CLOSED";
  blockers: Array<{ code: YearEndBlockerCode; message: string; name?: string; count?: number; endDate?: string; lockedThrough?: string }>;
  startDate: string;
  endDate: string;
  currency: string;
  revenue: string;
  expenses: string;
  profit: string;
  closingEntryId: string | null;
}

export interface BooksOverview {
  lockDate: string | null;
  taxLockDate: string | null;
  openingBalanceDate: string | null;
  currency: string;
  openingBalanceEquity: { accountId: string; code: string; balance: string; cleared: boolean } | null;
}

export interface Ref {
  id: string;
  code: string | null;
  name: string;
  nameAr: string | null;
}

export type ContactType = "BUSINESS" | "INDIVIDUAL";
export const ID_SCHEMES = ["TIN", "CRN", "NAT", "IQA", "PAS", "UNIFIED_700", "MOM", "MLS", "SAG", "GCC", "OTH"] as const;
export type IdScheme = (typeof ID_SCHEMES)[number];

export interface Contact {
  id: string;
  code: string | null;
  type: ContactType;
  isCustomer: boolean;
  isSupplier: boolean;
  name: string;
  nameAr: string | null;
  taxNumber: string | null;
  idScheme: IdScheme | null;
  idNumber: string | null;
  country: string;
  buildingNumber: string | null;
  street: string | null;
  district: string | null;
  city: string | null;
  postalCode: string | null;
  additionalNumber: string | null;
  email: string | null;
  phone: string | null;
  currency: string;
  paymentTermsDays: number;
  withholdingTaxCode: Ref | null;
  notes: string | null;
  isActive: boolean;
  balances: { receivable: string; payable: string };
  einvoiceReadiness: { ready: boolean; invoiceType: "STANDARD" | "SIMPLIFIED" | "BUSINESS" | "INDIVIDUAL" | null; missing: string[] };
}

export interface ContactStatement {
  contact: Ref;
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
    account: { code: string; name: string; nameAr: string | null; systemKey: string | null };
    debit: string;
    credit: string;
    balance: string;
  }>;
}

export interface SubledgerReconciliation {
  ledger: "receivables" | "payables";
  control: string;
  subledger: string;
  unassigned: string;
  reconciled: boolean;
}

export type ItemType = "GOODS" | "SERVICE";
export const UNIT_CODES = ["PCE", "C62", "EA", "SET", "BX", "PK", "CT", "HUR", "DAY", "WEE", "MON", "ANN", "KGM", "GRM", "TNE", "LTR", "MTR", "KMT", "MTK", "MTQ", "LS"] as const;

export interface Item {
  id: string;
  code: string;
  type: ItemType;
  name: string;
  nameAr: string | null;
  description: string | null;
  unitCode: string;
  salePrice: string | null;
  purchasePrice: string | null;
  salesAccount: Ref | null;
  purchaseAccount: Ref | null;
  salesTaxCode: Ref | null;
  purchaseTaxCode: Ref | null;
  isActive: boolean;
}

export type TaxCodeKind = "SALES" | "PURCHASE" | "WITHHOLDING";
export type TaxTreatment = "STANDARD" | "ZERO_RATED" | "EXEMPT" | "OUT_OF_SCOPE" | "REVERSE_CHARGE" | "IMPORT" | "WITHHOLDING";

export interface TaxCode {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  kind: TaxCodeKind;
  treatment: TaxTreatment;
  einvoiceCategory: string | null;
  reasonCode: string | null;
  reasonText: string | null;
  recoverable: boolean;
  returnBox: string | null;
  isSystem: boolean;
  isActive: boolean;
  taxAccount: Ref | null;
  reverseChargeAccount: Ref | null;
  currentRate: string | null;
  rates: Array<{ ratePercent: string; effectiveFrom: string; effectiveTo: string | null }>;
}

export interface TaxProfile {
  registration: "NOT_REGISTERED" | "REGISTERED" | "SPECIAL_SALES_TAX";
  filingFrequency: "MONTHLY" | "QUARTERLY" | "BIMONTHLY";
  buildingNumber: string | null;
  street: string | null;
  district: string | null;
  city: string | null;
  postalCode: string | null;
  additionalNumber: string | null;
  activityNumber: string | null;
  legalName: string;
  tradeName: string | null;
  country: "SA" | "JO";
  baseCurrency: string;
  taxNumber: string | null;
  commercialRegistration: string | null;
  einvoiceReadiness: { ready: boolean; missing: string[] };
}
