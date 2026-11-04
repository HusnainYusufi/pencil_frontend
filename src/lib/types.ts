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

/* ── Sales & e-invoicing ─────────────────────────────────────────────── */

export interface Address {
  street: string | null;
  buildingNumber: string | null;
  additionalNumber: string | null;
  district: string | null;
  city: string | null;
  postalCode: string | null;
  region: string | null;
  country: string | null;
}

export type ContactType = "BUSINESS" | "INDIVIDUAL";
export const ID_SCHEMES = ["CRN", "MOM", "MLS", "700", "SAG", "NAT", "GCC", "IQA", "PAS", "TIN", "OTH"] as const;

export interface Contact {
  id: string;
  type: ContactType;
  isCustomer: boolean;
  isSupplier: boolean;
  code: string | null;
  name: string;
  nameAr: string | null;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
  idScheme: string | null;
  idNumber: string | null;
  address: Address;
  paymentTermsDays: number | null;
  notes: string | null;
  isActive: boolean;
  balance?: string;
}

export type TaxCategory = "STANDARD" | "ZERO_RATED" | "EXEMPT" | "OUT_OF_SCOPE";

export interface TaxRate {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  rate: string;
  category: TaxCategory;
  exemptionCode: string | null;
  exemptionReason: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export type SalesDocumentType = "INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE";
export type InvoiceKind = "STANDARD" | "SIMPLIFIED";
export type SalesInvoiceStatus = "DRAFT" | "ISSUED" | "VOID";
export type EInvoiceStatus = "PENDING" | "CLEARED" | "REPORTED" | "REJECTED";
export const PAYMENT_MEANS = ["CREDIT", "CASH", "BANK_TRANSFER", "CARD", "OTHER"] as const;
export type PaymentMeans = (typeof PAYMENT_MEANS)[number];

export interface ContactRef {
  id: string;
  name: string;
  nameAr: string | null;
}

export interface SalesInvoiceSummary {
  id: string;
  type: SalesDocumentType;
  kind: InvoiceKind;
  status: SalesInvoiceStatus;
  number: string | null;
  contact: ContactRef | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  taxTotal: string;
  total: string;
  amountPaid: string;
  amountCredited: string;
  balanceDue: string;
  einvoiceStatus: EInvoiceStatus | null;
  reference: string | null;
  issuedAt: string | null;
  createdAt: string;
}

export interface PartySnapshot {
  type: ContactType;
  name: string;
  nameAr: string | null;
  vatNumber: string | null;
  idScheme: string | null;
  idNumber: string | null;
  address: (Omit<Address, "country"> & { country: string }) | null;
  email: string | null;
  phone: string | null;
}

export interface ValidationMessage {
  code?: string;
  message?: string;
  type?: string;
}

export interface SalesInvoiceDetail extends SalesInvoiceSummary {
  uuid: string;
  supplyDate: string | null;
  pricesIncludeTax: boolean;
  paymentMeans: PaymentMeans;
  reason: string | null;
  notes: string | null;
  terms: string | null;
  subtotal: string;
  discountTotal: string;
  taxableAmount: string;
  seller: PartySnapshot | null;
  buyer: PartySnapshot | null;
  qrCode: string | null;
  originalInvoice: { id: string; number: string | null; issueDate: string; total: string } | null;
  adjustments: Array<{ id: string; type: SalesDocumentType; number: string | null; status: SalesInvoiceStatus; issueDate: string; total: string }>;
  payments: Array<{ id: string; number: string; date: string; amount: string }>;
  journalEntry: { id: string; number: string | null } | null;
  einvoice: {
    provider: string;
    submissionType: "CLEARANCE" | "REPORTING";
    status: EInvoiceStatus;
    icv: number;
    invoiceHash: string;
    warnings: ValidationMessage[] | null;
    errors: ValidationMessage[] | null;
    attempts: number;
    lastAttemptAt: string | null;
    nextAttemptAt: string | null;
    acceptedAt: string | null;
  } | null;
  voidedAt: string | null;
  voidReason: string | null;
  lines: Array<{
    id: string;
    lineNo: number;
    description: string;
    quantity: string;
    unitCode: string;
    unitPrice: string;
    discount: string;
    taxRate: { id: string; code: string; name: string; nameAr: string | null };
    taxCategory: TaxCategory;
    taxPercent: string;
    exemptionCode: string | null;
    account: AccountRef;
    costCenter: { id: string; code: string; name: string } | null;
    netAmount: string;
    taxAmount: string;
    totalAmount: string;
  }>;
}

export interface CustomerPayment {
  id: string;
  number: string;
  status: "POSTED" | "VOID";
  date: string;
  contact: ContactRef;
  account: AccountRef;
  currency: string;
  amount: string;
  method: PaymentMeans;
  reference: string | null;
  notes: string | null;
  journalEntry: { id: string; number: string | null } | null;
  allocations: Array<{ invoice: { id: string; number: string | null; type: SalesDocumentType; issueDate: string; total: string }; amount: string }>;
  voidedAt: string | null;
  createdAt: string;
}

export interface CompanyProfile {
  id: string;
  legalName: string;
  tradeName: string | null;
  country: "SA" | "JO";
  baseCurrency: string;
  timezone: string;
  locale: string;
  taxNumber: string | null;
  commercialRegistration: string | null;
  addressStreet: string | null;
  addressBuildingNumber: string | null;
  addressAdditionalNumber: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressRegion: string | null;
}

export interface EInvoicingUnit {
  id: string;
  provider: string;
  environment: "SANDBOX" | "SIMULATION" | "PRODUCTION";
  name: string;
  status: "PENDING" | "ACTIVE" | "REVOKED";
  commonName: string;
  serialNumber: string;
  certificateExpiresAt: string | null;
  lastIcv: number;
  lastError: string | null;
  onboardedAt: string | null;
  createdAt: string;
}

export interface EInvoicingStatus {
  provider: string | null;
  required: boolean;
  activeUnit: EInvoicingUnit | null;
  documents: Record<EInvoiceStatus, number>;
}
