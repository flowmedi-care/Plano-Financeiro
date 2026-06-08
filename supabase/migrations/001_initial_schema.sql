-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  active_scope TEXT NOT NULL DEFAULT 'personal' CHECK (active_scope IN ('personal', 'household')),
  active_household_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Households
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_active_household_id_fkey
  FOREIGN KEY (active_household_id) REFERENCES households(id) ON DELETE SET NULL;

CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id)
);

CREATE TABLE household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, email)
);

-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  name TEXT NOT NULL,
  bank TEXT NOT NULL CHECK (bank IN ('nubank', 'itau')),
  account_type TEXT NOT NULL DEFAULT 'credit_card' CHECK (account_type IN ('credit_card')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Merchant rules
CREATE TABLE merchant_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  merchant_key TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX merchant_rules_personal_unique
  ON merchant_rules (user_id, merchant_key, COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE scope = 'personal';

CREATE UNIQUE INDEX merchant_rules_household_unique
  ON merchant_rules (household_id, merchant_key, COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE scope = 'household';

-- Statement imports
CREATE TABLE statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'pdf')),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'done', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  import_id UUID REFERENCES statement_imports(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  merchant_key TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  installment_current INTEGER,
  installment_total INTEGER,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_payment BOOLEAN NOT NULL DEFAULT FALSE,
  is_iof BOOLEAN NOT NULL DEFAULT FALSE,
  auto_categorized BOOLEAN NOT NULL DEFAULT FALSE,
  dedup_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, dedup_hash)
);

CREATE INDEX transactions_user_date_idx ON transactions (user_id, transaction_date DESC);
CREATE INDEX transactions_merchant_key_idx ON transactions (merchant_key);
CREATE INDEX transactions_category_idx ON transactions (category_id);

-- Budget
CREATE TABLE budget_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, household_id, scope, year, month)
);

CREATE TABLE budget_incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_month_id UUID NOT NULL REFERENCES budget_months(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE budget_fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_month_id UUID NOT NULL REFERENCES budget_months(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE budget_variable_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_month_id UUID NOT NULL REFERENCES budget_months(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (budget_month_id, category_id)
);

CREATE TABLE budget_card_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_month_id UUID NOT NULL REFERENCES budget_months(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (budget_month_id, account_id)
);

-- Installment schedules
CREATE TABLE installment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  merchant_key TEXT NOT NULL,
  description TEXT NOT NULL,
  installment_amount_cents INTEGER NOT NULL,
  installment_current INTEGER NOT NULL,
  installment_total INTEGER NOT NULL,
  reference_month TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('transaction', 'itau_projection')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper: check household membership
CREATE OR REPLACE FUNCTION is_household_member(household UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = household AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_variable_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_card_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Households
CREATE POLICY "households_select" ON households FOR SELECT
  USING (created_by = auth.uid() OR is_household_member(id));
CREATE POLICY "households_insert" ON households FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "households_update" ON households FOR UPDATE
  USING (created_by = auth.uid() OR is_household_member(id));

-- Household members
CREATE POLICY "household_members_select" ON household_members FOR SELECT
  USING (user_id = auth.uid() OR is_household_member(household_id));
CREATE POLICY "household_members_insert" ON household_members FOR INSERT
  WITH CHECK (is_household_member(household_id) OR EXISTS (
    SELECT 1 FROM households h WHERE h.id = household_id AND h.created_by = auth.uid()
  ));
CREATE POLICY "household_members_delete" ON household_members FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM households h WHERE h.id = household_id AND h.created_by = auth.uid()
  ));

-- Household invites
CREATE POLICY "household_invites_select" ON household_invites FOR SELECT
  USING (
    invited_by = auth.uid()
    OR is_household_member(household_id)
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "household_invites_insert" ON household_invites FOR INSERT
  WITH CHECK (invited_by = auth.uid() AND is_household_member(household_id));
CREATE POLICY "household_invites_update" ON household_invites FOR UPDATE
  USING (
    invited_by = auth.uid()
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Generic scoped data policies
CREATE POLICY "accounts_all" ON accounts FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));

CREATE POLICY "categories_all" ON categories FOR ALL
  USING (
    (scope = 'personal' AND user_id = auth.uid())
    OR (scope = 'household' AND household_id IS NOT NULL AND is_household_member(household_id))
    OR is_system = TRUE
  )
  WITH CHECK (
    (scope = 'personal' AND user_id = auth.uid())
    OR (scope = 'household' AND household_id IS NOT NULL AND is_household_member(household_id))
  );

CREATE POLICY "merchant_rules_all" ON merchant_rules FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));

CREATE POLICY "statement_imports_all" ON statement_imports FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));

CREATE POLICY "transactions_all" ON transactions FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));

CREATE POLICY "budget_months_all" ON budget_months FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));

CREATE POLICY "budget_incomes_all" ON budget_incomes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM budget_months bm
    WHERE bm.id = budget_month_id
      AND (bm.user_id = auth.uid() OR (bm.household_id IS NOT NULL AND is_household_member(bm.household_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM budget_months bm
    WHERE bm.id = budget_month_id
      AND (bm.user_id = auth.uid() OR (bm.household_id IS NOT NULL AND is_household_member(bm.household_id)))
  ));

CREATE POLICY "budget_fixed_all" ON budget_fixed_expenses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM budget_months bm
    WHERE bm.id = budget_month_id
      AND (bm.user_id = auth.uid() OR (bm.household_id IS NOT NULL AND is_household_member(bm.household_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM budget_months bm
    WHERE bm.id = budget_month_id
      AND (bm.user_id = auth.uid() OR (bm.household_id IS NOT NULL AND is_household_member(bm.household_id)))
  ));

CREATE POLICY "budget_variable_all" ON budget_variable_expenses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM budget_months bm
    WHERE bm.id = budget_month_id
      AND (bm.user_id = auth.uid() OR (bm.household_id IS NOT NULL AND is_household_member(bm.household_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM budget_months bm
    WHERE bm.id = budget_month_id
      AND (bm.user_id = auth.uid() OR (bm.household_id IS NOT NULL AND is_household_member(bm.household_id)))
  ));

CREATE POLICY "budget_card_all" ON budget_card_targets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM budget_months bm
    WHERE bm.id = budget_month_id
      AND (bm.user_id = auth.uid() OR (bm.household_id IS NOT NULL AND is_household_member(bm.household_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM budget_months bm
    WHERE bm.id = budget_month_id
      AND (bm.user_id = auth.uid() OR (bm.household_id IS NOT NULL AND is_household_member(bm.household_id)))
  ));

CREATE POLICY "installment_schedules_all" ON installment_schedules FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));

-- Seed system categories (global)
INSERT INTO categories (id, user_id, household_id, scope, name, color, is_system) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, NULL, 'personal', 'Alimentação', '#22c55e', TRUE),
  ('00000000-0000-0000-0000-000000000002', NULL, NULL, 'personal', 'Transporte', '#3b82f6', TRUE),
  ('00000000-0000-0000-0000-000000000003', NULL, NULL, 'personal', 'Assinaturas', '#8b5cf6', TRUE),
  ('00000000-0000-0000-0000-000000000004', NULL, NULL, 'personal', 'Saúde', '#ef4444', TRUE),
  ('00000000-0000-0000-0000-000000000005', NULL, NULL, 'personal', 'Educação', '#f59e0b', TRUE),
  ('00000000-0000-0000-0000-000000000006', NULL, NULL, 'personal', 'Lazer', '#ec4899', TRUE),
  ('00000000-0000-0000-0000-000000000007', NULL, NULL, 'personal', 'Moradia', '#14b8a6', TRUE),
  ('00000000-0000-0000-0000-000000000008', NULL, NULL, 'personal', 'Vestuário', '#a855f7', TRUE),
  ('00000000-0000-0000-0000-000000000009', NULL, NULL, 'personal', 'Financiamento fatura', '#64748b', TRUE),
  ('00000000-0000-0000-0000-000000000010', NULL, NULL, 'personal', 'Outros', '#6b7280', TRUE);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Storage bucket for imports
INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "imports_select_own" ON storage.objects FOR SELECT
  USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "imports_insert_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "imports_delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);
