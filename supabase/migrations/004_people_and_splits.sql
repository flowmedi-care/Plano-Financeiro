-- Pessoas para controle de reembolso (separado de categorias)

CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX people_user_id_idx ON people (user_id);
CREATE INDEX people_household_id_idx ON people (household_id);

CREATE TABLE transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transaction_id, person_id)
);

CREATE INDEX transaction_splits_transaction_id_idx ON transaction_splits (transaction_id);
CREATE INDEX transaction_splits_person_id_idx ON transaction_splits (person_id);

ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "people_all" ON people FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));

CREATE POLICY "transaction_splits_all" ON transaction_splits FOR ALL
  USING (EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_splits.transaction_id
      AND (t.user_id = auth.uid() OR (t.household_id IS NOT NULL AND is_household_member(t.household_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_splits.transaction_id
      AND (t.user_id = auth.uid() OR (t.household_id IS NOT NULL AND is_household_member(t.household_id)))
  ));
