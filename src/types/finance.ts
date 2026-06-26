// ─────────────────────────────────────────────────────────────
// Phase 3 Types — Director Office & Financial Management
// ─────────────────────────────────────────────────────────────

export type FundingCategory =
  | 'Gold Loan' | 'Personal Loan' | 'Relative Loan' | 'Friend Loan'
  | 'Bank Loan' | 'Overdraft' | 'Director Contribution' | 'Client Advance' | 'Vendor Credit'
export type InterestType = 'None' | 'Monthly' | 'Annual' | 'Flat'
export type FundingStatus = 'Active' | 'Partially Repaid' | 'Closed' | 'Overdue'
export type BillStatus = 'Draft' | 'Submitted' | 'Approved' | 'Partially Paid' | 'Paid' | 'Overdue'
export type PayableStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Disputed'
export type TxnType = 'Credit' | 'Debit' | 'Transfer'
export type AccountType = 'Current' | 'Savings' | 'Overdraft' | 'Cash'

export interface BankAccount {
  id: string
  name: string
  bank_name: string
  account_number?: string
  ifsc?: string
  account_type: AccountType
  opening_balance: number
  current_balance: number
  is_active: boolean
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Funding {
  id: string
  source_name: string
  category: FundingCategory
  lender_name?: string
  lender_phone?: string
  amount_received: number
  date_received: string
  repayment_date?: string
  interest_type: InterestType
  interest_rate: number
  amount_repaid: number
  interest_paid: number
  bank_account_id?: string
  status: FundingStatus
  linked_project_id?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  // computed
  outstanding?: number
  interest_accrued?: number
  days_remaining?: number
  days_overdue?: number
  monthly_interest?: number
}

export interface FundingRepayment {
  id: string
  funding_id: string
  payment_date: string
  principal: number
  interest: number
  total: number
  bank_account_id?: string
  notes?: string
  created_by?: string
  created_at: string
}

export interface Receivable {
  id: string
  project_id: string
  client_name: string
  bill_number: string
  bill_date: string
  submitted_date?: string
  expected_date?: string
  bill_amount: number
  amount_received: number
  retention_pct: number
  gst_amount: number
  status: BillStatus
  remarks?: string
  created_by?: string
  created_at: string
  updated_at: string
  // computed
  balance?: number
  delay_days?: number
  project?: { name: string }
}

export interface ReceivablePayment {
  id: string
  receivable_id: string
  payment_date: string
  amount: number
  bank_account_id?: string
  reference?: string
  notes?: string
  created_by?: string
  created_at: string
}

export interface Payable {
  id: string
  project_id?: string
  supplier_name: string
  invoice_number?: string
  invoice_date: string
  due_date?: string
  amount: number
  amount_paid: number
  status: PayableStatus
  po_number?: string
  material_id?: string
  remarks?: string
  created_by?: string
  created_at: string
  updated_at: string
  // computed
  outstanding?: number
  days_overdue?: number
  project?: { name: string }
}

export interface PayablePayment {
  id: string
  payable_id: string
  payment_date: string
  amount: number
  bank_account_id?: string
  reference?: string
  notes?: string
  created_by?: string
  created_at: string
}

export interface CashBookEntry {
  id: string
  txn_date: string
  txn_type: TxnType
  category: string
  description: string
  amount: number
  project_id?: string
  bank_account_id?: string
  reference?: string
  balance?: number
  created_by?: string
  created_at: string
  project?: { name: string }
}

export interface RecurringExpense {
  id: string
  name: string
  category: string
  amount: number
  due_day: number
  is_active: boolean
  project_id?: string
  notes?: string
  created_by?: string
  created_at: string
}

// ── COMPUTED DASHBOARD TYPES ──────────────────────────────────
export interface FinancialSummary {
  cashPosition: number
  totalBankBalance: number
  outstandingReceivables: number
  outstandingPayables: number
  totalActiveFunding: number
  interestDueThisMonth: number
  expectedInflowThirtyDays: number
  expectedOutflowThirtyDays: number
  netCashProjection: number
  overdueReceivables: number
  overduePayables: number
  overdueFunding: number
}

export interface CashFlowForecast {
  date: string
  label: string
  inflow: number
  outflow: number
  closingBalance: number
  items: CashFlowItem[]
}

export interface CashFlowItem {
  type: 'receivable' | 'payable' | 'funding_repayment' | 'recurring' | 'interest'
  description: string
  amount: number
  direction: 'in' | 'out'
  reference_id?: string
}

export interface ProjectProfitability {
  project_id: string
  project_name: string
  contract_value: number
  work_done_value: number
  total_expenses: number
  material_cost: number
  labour_cost: number
  gross_profit: number
  profit_pct: number
  cash_received: number
  outstanding_amount: number
  forecast_profit: number
}
