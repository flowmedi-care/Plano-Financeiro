export type ScopeType = "personal" | "household";
export type AccountType = "credit_card";
export type BankProvider = "nubank" | "itau";
export type ImportStatus = "processing" | "done" | "error";
export type HouseholdRole = "owner" | "member";
export type InviteStatus = "pending" | "accepted" | "declined";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  active_scope: ScopeType;
  active_household_id: string | null;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  created_at: string;
}

export interface HouseholdInvite {
  id: string;
  household_id: string;
  email: string;
  invited_by: string;
  status: InviteStatus;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  household_id: string | null;
  scope: ScopeType;
  name: string;
  bank: BankProvider;
  account_type: AccountType;
  created_at: string;
  cards?: Card[];
}

export interface Card {
  id: string;
  account_id: string;
  name: string;
  last_digits: string | null;
  holder_name: string | null;
  created_at: string;
}

export interface Person {
  id: string;
  user_id: string;
  household_id: string | null;
  scope: ScopeType;
  name: string;
  color: string;
  created_at: string;
}

export interface TransactionSplit {
  id: string;
  transaction_id: string;
  person_id: string;
  amount_cents: number;
  created_at: string;
  person?: Person | null;
}

export interface Category {
  id: string;
  user_id: string | null;
  household_id: string | null;
  scope: ScopeType;
  name: string;
  color: string;
  is_system: boolean;
  created_at: string;
}

export interface MerchantRule {
  id: string;
  user_id: string;
  household_id: string | null;
  scope: ScopeType;
  account_id: string | null;
  merchant_key: string;
  category_id: string;
  created_at: string;
}

export type SplitMode = "full" | "equal";

export interface MerchantSplitRule {
  id: string;
  user_id: string;
  household_id: string | null;
  scope: ScopeType;
  account_id: string | null;
  merchant_key: string;
  split_mode: SplitMode;
  person_ids: string[];
  created_at: string;
}

export interface StatementImport {
  id: string;
  user_id: string;
  household_id: string | null;
  scope: ScopeType;
  account_id: string;
  reference_month: string;
  file_name: string;
  file_path: string | null;
  file_type: "csv" | "pdf";
  status: ImportStatus;
  error_message: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  household_id: string | null;
  scope: ScopeType;
  account_id: string;
  card_id: string | null;
  import_id: string | null;
  reference_month: string | null;
  transaction_date: string;
  description: string;
  merchant_key: string;
  amount_cents: number;
  installment_current: number | null;
  installment_total: number | null;
  category_id: string | null;
  is_payment: boolean;
  is_iof: boolean;
  auto_categorized: boolean;
  dedup_hash: string;
  created_at: string;
  category?: Category | null;
  account?: Account | null;
  card?: Card | null;
  splits?: TransactionSplit[];
}

export interface BudgetMonth {
  id: string;
  user_id: string;
  household_id: string | null;
  scope: ScopeType;
  year: number;
  month: number;
  created_at: string;
}

export interface BudgetIncome {
  id: string;
  budget_month_id: string;
  label: string;
  amount_cents: number;
  created_at: string;
}

export interface BudgetFixedExpense {
  id: string;
  budget_month_id: string;
  label: string;
  amount_cents: number;
  created_at: string;
}

export type CashFlowEntryType = "income" | "fixed_expense" | "card_installment" | "variable";
export type CashFlowEntrySource = "manual" | "template" | "import" | "estimated";
export type CashFlowTemplateType = "income" | "fixed_expense";
export type EstimationMethod = "none" | "manual" | "historical_avg" | "surplus_allocation";

export interface CashFlowTemplate {
  id: string;
  user_id: string;
  household_id: string | null;
  scope: ScopeType;
  type: CashFlowTemplateType;
  label: string;
  amount_cents: number;
  recurrence: "monthly" | "none";
  day_of_month: number | null;
  category_id: string | null;
  account_id: string | null;
  start_month: string | null;
  end_month: string | null;
  created_at: string;
}

export interface CashFlowEntry {
  id: string;
  budget_month_id: string;
  template_id: string | null;
  type: CashFlowEntryType;
  label: string;
  amount_cents: number | null;
  category_id: string | null;
  account_id: string | null;
  card_id: string | null;
  source: CashFlowEntrySource;
  is_confirmed: boolean;
  created_at: string;
  category?: Category | null;
  account?: Account | null;
}

export interface CashFlowSettings {
  id: string;
  user_id: string;
  household_id: string | null;
  scope: ScopeType;
  opening_balance_cents: number;
  projection_months: number;
  default_estimation_method: EstimationMethod;
  created_at: string;
}

export interface BudgetVariableExpense {
  id: string;
  budget_month_id: string;
  category_id: string;
  amount_cents: number | null;
  is_tracked: boolean;
  estimation_method: EstimationMethod;
  created_at: string;
  category?: Category;
}

export interface BudgetCardTarget {
  id: string;
  budget_month_id: string;
  account_id: string;
  amount_cents: number;
  created_at: string;
  account?: Account;
}

export interface InstallmentSchedule {
  id: string;
  user_id: string;
  household_id: string | null;
  scope: ScopeType;
  account_id: string;
  transaction_id: string | null;
  merchant_key: string;
  description: string;
  installment_amount_cents: number;
  installment_current: number;
  installment_total: number;
  reference_month: string;
  source: "transaction" | "itau_projection";
  created_at: string;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  merchantKey: string;
  amountCents: number;
  installmentCurrent: number | null;
  installmentTotal: number | null;
  isPayment: boolean;
  isIof: boolean;
  cardLastDigits?: string;
  cardId?: string | null;
}

export interface DetectedCardSummary {
  lastDigits: string;
  totalCents: number;
  holderName?: string;
}

export interface ParsedInstallmentProjection {
  date: string;
  description: string;
  merchantKey: string;
  installmentCurrent: number;
  installmentTotal: number;
  amountCents: number;
  cardLastDigits?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  installmentProjections: ParsedInstallmentProjection[];
  detectedCards?: DetectedCardSummary[];
  referenceMonth?: string;
  warnings: string[];
}
