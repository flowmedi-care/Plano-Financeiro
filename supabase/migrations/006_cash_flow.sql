-- Fluxo de caixa: templates recorrentes, lançamentos mensais, settings

CREATE TABLE cash_flow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  type TEXT NOT NULL CHECK (type IN ('income', 'fixed_expense')),
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  recurrence TEXT NOT NULL DEFAULT 'monthly' CHECK (recurrence IN ('monthly', 'none')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  start_month TEXT,
  end_month TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cash_flow_templates_user_id_idx ON cash_flow_templates (user_id);
CREATE INDEX cash_flow_templates_household_id_idx ON cash_flow_templates (household_id);

CREATE TABLE cash_flow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_month_id UUID NOT NULL REFERENCES budget_months(id) ON DELETE CASCADE,
  template_id UUID REFERENCES cash_flow_templates(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'fixed_expense', 'card_installment', 'variable')),
  label TEXT NOT NULL,
  amount_cents INTEGER CHECK (amount_cents IS NULL OR amount_cents >= 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'template', 'import', 'estimated')),
  is_confirmed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cash_flow_entries_budget_month_id_idx ON cash_flow_entries (budget_month_id);

CREATE TABLE cash_flow_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  opening_balance_cents INTEGER NOT NULL DEFAULT 0,
  projection_months INTEGER NOT NULL DEFAULT 12,
  default_estimation_method TEXT NOT NULL DEFAULT 'surplus_allocation'
    CHECK (default_estimation_method IN ('none', 'manual', 'historical_avg', 'surplus_allocation')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX cash_flow_settings_personal_unique
  ON cash_flow_settings (user_id) WHERE scope = 'personal';

CREATE UNIQUE INDEX cash_flow_settings_household_unique
  ON cash_flow_settings (household_id) WHERE scope = 'household';

ALTER TABLE budget_variable_expenses
  ALTER COLUMN amount_cents DROP NOT NULL;

ALTER TABLE budget_variable_expenses
  ADD COLUMN IF NOT EXISTS is_tracked BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS estimation_method TEXT NOT NULL DEFAULT 'none'
    CHECK (estimation_method IN ('none', 'manual', 'historical_avg', 'surplus_allocation'));

-- Migrar receitas e fixos existentes para cash_flow_entries
INSERT INTO cash_flow_entries (budget_month_id, type, label, amount_cents, source, is_confirmed)
SELECT budget_month_id, 'income', label, amount_cents, 'manual', true
FROM budget_incomes;

INSERT INTO cash_flow_entries (budget_month_id, type, label, amount_cents, source, is_confirmed)
SELECT budget_month_id, 'fixed_expense', label, amount_cents, 'manual', true
FROM budget_fixed_expenses;

ALTER TABLE cash_flow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_flow_templates_all" ON cash_flow_templates FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));

CREATE POLICY "cash_flow_entries_all" ON cash_flow_entries FOR ALL
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

CREATE POLICY "cash_flow_settings_all" ON cash_flow_settings FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));
