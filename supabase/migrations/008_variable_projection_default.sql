-- Projeção mensal padrão de despesas variáveis no fluxo de caixa

ALTER TABLE cash_flow_settings
  ADD COLUMN IF NOT EXISTS monthly_variable_projection_cents INTEGER NOT NULL DEFAULT 0;
