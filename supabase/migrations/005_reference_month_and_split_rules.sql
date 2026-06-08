-- Mês de referência da fatura nas transações + regras de reembolso por estabelecimento

ALTER TABLE transactions ADD COLUMN reference_month TEXT;

UPDATE transactions t
SET reference_month = si.reference_month
FROM statement_imports si
WHERE t.import_id = si.id AND t.reference_month IS NULL;

CREATE INDEX transactions_reference_month_idx ON transactions (reference_month);

CREATE TABLE merchant_split_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  merchant_key TEXT NOT NULL,
  split_mode TEXT NOT NULL CHECK (split_mode IN ('full', 'equal')),
  person_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX merchant_split_rules_personal_unique
  ON merchant_split_rules (user_id, merchant_key, COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE scope = 'personal';

CREATE UNIQUE INDEX merchant_split_rules_household_unique
  ON merchant_split_rules (household_id, merchant_key, COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE scope = 'household';

ALTER TABLE merchant_split_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_split_rules_all" ON merchant_split_rules FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));
