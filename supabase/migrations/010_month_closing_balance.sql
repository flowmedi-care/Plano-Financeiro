-- Saldo final registrado manualmente por mês (vira saldo inicial do mês seguinte)

ALTER TABLE budget_months
  ADD COLUMN closing_balance_cents BIGINT;
