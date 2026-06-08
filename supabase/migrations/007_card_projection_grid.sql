-- Projeção manual de fatura por cartão e mês

ALTER TABLE cash_flow_entries
  ADD COLUMN card_id UUID REFERENCES cards(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX cash_flow_entries_card_month_unique
  ON cash_flow_entries (budget_month_id, card_id)
  WHERE type = 'card_installment' AND card_id IS NOT NULL;
