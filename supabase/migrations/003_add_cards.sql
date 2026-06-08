-- Cartões por conta (ex: Itaú final 6587, 2991, etc.)

CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  last_digits TEXT,
  holder_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX cards_account_last_digits_unique
  ON cards (account_id, last_digits)
  WHERE last_digits IS NOT NULL;

CREATE INDEX cards_account_id_idx ON cards (account_id);

ALTER TABLE transactions
  ADD COLUMN card_id UUID REFERENCES cards(id) ON DELETE SET NULL;

ALTER TABLE installment_schedules
  ADD COLUMN card_id UUID REFERENCES cards(id) ON DELETE SET NULL;

CREATE INDEX transactions_card_id_idx ON transactions (card_id);

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_account_id_dedup_hash_key;

CREATE UNIQUE INDEX transactions_dedup_unique
  ON transactions (
    account_id,
    COALESCE(card_id, '00000000-0000-0000-0000-000000000000'::uuid),
    dedup_hash
  );

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Cartão padrão para contas existentes
INSERT INTO cards (account_id, name)
SELECT a.id, 'Cartão principal'
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM cards c WHERE c.account_id = a.id);

CREATE POLICY "cards_all" ON cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = cards.account_id
        AND (
          a.user_id = auth.uid()
          OR (a.household_id IS NOT NULL AND is_household_member(a.household_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = cards.account_id
        AND (
          a.user_id = auth.uid()
          OR (a.household_id IS NOT NULL AND is_household_member(a.household_id))
        )
    )
  );
