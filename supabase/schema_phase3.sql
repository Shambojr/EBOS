-- ═══════════════════════════════════════════════════════════════
-- EASE BUILDERS SITE MANAGER v4 — PHASE 3
-- Director Office & Financial Management
-- Run this in Supabase SQL Editor AFTER Phase 2 schema
-- ═══════════════════════════════════════════════════════════════

-- ── ENUMS ──────────────────────────────────────────────────────
CREATE TYPE funding_category AS ENUM (
  'Gold Loan','Personal Loan','Relative Loan','Friend Loan',
  'Bank Loan','Overdraft','Director Contribution','Client Advance','Vendor Credit'
);
CREATE TYPE interest_type AS ENUM ('None','Monthly','Annual','Flat');
CREATE TYPE funding_status AS ENUM ('Active','Partially Repaid','Closed','Overdue');
CREATE TYPE bill_status AS ENUM ('Draft','Submitted','Approved','Partially Paid','Paid','Overdue');
CREATE TYPE payable_status AS ENUM ('Pending','Partially Paid','Paid','Overdue','Disputed');
CREATE TYPE txn_type AS ENUM ('Credit','Debit','Transfer');
CREATE TYPE account_type AS ENUM ('Current','Savings','Overdraft','Cash');

-- ── BANK ACCOUNTS ──────────────────────────────────────────────
CREATE TABLE public.bank_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,           -- "SBI Current A/C", "Canara OD"
  bank_name       TEXT NOT NULL,
  account_number  TEXT,
  ifsc            TEXT,
  account_type    account_type NOT NULL DEFAULT 'Current',
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── FUNDING (Loans & Capital) ───────────────────────────────────
CREATE TABLE public.funding (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name         TEXT NOT NULL,        -- "SBI Gold Loan", "Raghunath Contribution"
  category            funding_category NOT NULL,
  lender_name         TEXT,
  lender_phone        TEXT,
  amount_received     NUMERIC(15,2) NOT NULL,
  date_received       DATE NOT NULL,
  repayment_date      DATE,
  interest_type       interest_type NOT NULL DEFAULT 'None',
  interest_rate       NUMERIC(6,3) DEFAULT 0,  -- % per annum/month
  amount_repaid       NUMERIC(15,2) NOT NULL DEFAULT 0,
  interest_paid       NUMERIC(15,2) NOT NULL DEFAULT 0,
  bank_account_id     UUID REFERENCES public.bank_accounts(id),
  status              funding_status NOT NULL DEFAULT 'Active',
  linked_project_id   UUID REFERENCES public.projects(id),
  documents           JSONB DEFAULT '[]'::jsonb,
  notes               TEXT,
  created_by          UUID REFERENCES public.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── FUNDING REPAYMENT HISTORY ───────────────────────────────────
CREATE TABLE public.funding_repayments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funding_id    UUID NOT NULL REFERENCES public.funding(id) ON DELETE CASCADE,
  payment_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  principal     NUMERIC(15,2) NOT NULL DEFAULT 0,
  interest      NUMERIC(15,2) NOT NULL DEFAULT 0,
  total         NUMERIC(15,2) GENERATED ALWAYS AS (principal + interest) STORED,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  notes         TEXT,
  created_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RECEIVABLES (Client Running Bills) ─────────────────────────
CREATE TABLE public.receivables (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_name       TEXT NOT NULL,
  bill_number       TEXT NOT NULL,
  bill_date         DATE NOT NULL,
  submitted_date    DATE,
  expected_date     DATE,
  bill_amount       NUMERIC(15,2) NOT NULL,
  amount_received   NUMERIC(15,2) NOT NULL DEFAULT 0,
  retention_pct     NUMERIC(5,2) DEFAULT 0,
  gst_amount        NUMERIC(15,2) DEFAULT 0,
  status            bill_status NOT NULL DEFAULT 'Draft',
  remarks           TEXT,
  created_by        UUID REFERENCES public.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RECEIVABLE PAYMENTS ─────────────────────────────────────────
CREATE TABLE public.receivable_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receivable_id   UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  amount          NUMERIC(15,2) NOT NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  reference       TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── VENDOR PAYABLES ─────────────────────────────────────────────
CREATE TABLE public.payables (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  supplier_name   TEXT NOT NULL,
  invoice_number  TEXT,
  invoice_date    DATE NOT NULL,
  due_date        DATE,
  amount          NUMERIC(15,2) NOT NULL,
  amount_paid     NUMERIC(15,2) NOT NULL DEFAULT 0,
  status          payable_status NOT NULL DEFAULT 'Pending',
  po_number       TEXT,
  material_id     UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  remarks         TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PAYABLE PAYMENTS ────────────────────────────────────────────
CREATE TABLE public.payable_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payable_id      UUID NOT NULL REFERENCES public.payables(id) ON DELETE CASCADE,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  amount          NUMERIC(15,2) NOT NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  reference       TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CASH BOOK ───────────────────────────────────────────────────
CREATE TABLE public.cash_book (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  txn_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  txn_type        txn_type NOT NULL,
  category        TEXT NOT NULL,           -- "Labour Payment","Material","Office","Salary"
  description     TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  reference       TEXT,
  balance         NUMERIC(15,2),           -- running balance (computed on insert)
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RECURRING EXPENSES (salary, rent, etc.) ─────────────────────
CREATE TABLE public.recurring_expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,           -- "Office Rent", "Site Engineer Salary"
  category        TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  due_day         INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31), -- day of month
  is_active       BOOLEAN NOT NULL DEFAULT true,
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  notes           TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ─────────────────────────────────────────────────────
CREATE INDEX idx_funding_status        ON public.funding(status);
CREATE INDEX idx_funding_repayment     ON public.funding(repayment_date);
CREATE INDEX idx_receivables_project   ON public.receivables(project_id);
CREATE INDEX idx_receivables_status    ON public.receivables(status);
CREATE INDEX idx_receivables_expected  ON public.receivables(expected_date);
CREATE INDEX idx_payables_project      ON public.payables(project_id);
CREATE INDEX idx_payables_status       ON public.payables(status);
CREATE INDEX idx_payables_due          ON public.payables(due_date);
CREATE INDEX idx_cash_book_date        ON public.cash_book(txn_date DESC);
CREATE INDEX idx_cash_book_project     ON public.cash_book(project_id);

-- ── UPDATED_AT TRIGGERS ─────────────────────────────────────────
DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY[
  'bank_accounts','funding','receivables','payables'
]) LOOP
  EXECUTE format(
    'CREATE TRIGGER trg_%s_p3_upd BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
    t, t
  );
END LOOP; END $$;

-- ── REALTIME ────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.funding;
ALTER PUBLICATION supabase_realtime ADD TABLE public.receivables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_book;

-- ── RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.bank_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_repayments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payable_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_book           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses  ENABLE ROW LEVEL SECURITY;

-- BANK ACCOUNTS: director only
CREATE POLICY "bank_director" ON public.bank_accounts FOR ALL USING (is_director());

-- FUNDING: director only
CREATE POLICY "funding_director" ON public.funding FOR ALL USING (is_director());
CREATE POLICY "funding_repay_director" ON public.funding_repayments FOR ALL USING (is_director());

-- RECEIVABLES: director + accountant
CREATE POLICY "recv_select" ON public.receivables FOR SELECT USING (get_my_role() IN ('director','accountant'));
CREATE POLICY "recv_insert" ON public.receivables FOR INSERT WITH CHECK (get_my_role() IN ('director','accountant'));
CREATE POLICY "recv_update" ON public.receivables FOR UPDATE USING (get_my_role() IN ('director','accountant'));
CREATE POLICY "recv_delete" ON public.receivables FOR DELETE USING (is_director());
CREATE POLICY "recv_pay_select" ON public.receivable_payments FOR SELECT USING (get_my_role() IN ('director','accountant'));
CREATE POLICY "recv_pay_insert" ON public.receivable_payments FOR INSERT WITH CHECK (get_my_role() IN ('director','accountant'));
CREATE POLICY "recv_pay_delete" ON public.receivable_payments FOR DELETE USING (is_director());

-- PAYABLES: director + accountant
CREATE POLICY "pay_select" ON public.payables FOR SELECT USING (get_my_role() IN ('director','accountant'));
CREATE POLICY "pay_insert" ON public.payables FOR INSERT WITH CHECK (get_my_role() IN ('director','accountant'));
CREATE POLICY "pay_update" ON public.payables FOR UPDATE USING (get_my_role() IN ('director','accountant'));
CREATE POLICY "pay_delete" ON public.payables FOR DELETE USING (is_director());
CREATE POLICY "pay_pay_select" ON public.payable_payments FOR SELECT USING (get_my_role() IN ('director','accountant'));
CREATE POLICY "pay_pay_insert" ON public.payable_payments FOR INSERT WITH CHECK (get_my_role() IN ('director','accountant'));
CREATE POLICY "pay_pay_delete" ON public.payable_payments FOR DELETE USING (is_director());

-- CASH BOOK: director + accountant
CREATE POLICY "cash_select" ON public.cash_book FOR SELECT USING (get_my_role() IN ('director','accountant'));
CREATE POLICY "cash_insert" ON public.cash_book FOR INSERT WITH CHECK (get_my_role() IN ('director','accountant'));
CREATE POLICY "cash_delete" ON public.cash_book FOR DELETE USING (is_director());

-- RECURRING: director only
CREATE POLICY "recur_director" ON public.recurring_expenses FOR ALL USING (is_director());
