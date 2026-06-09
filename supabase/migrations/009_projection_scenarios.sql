-- Cenários de projeção de despesas variáveis

CREATE TABLE projection_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'household')),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'monthly')),
  fixed_amount_cents INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX projection_scenarios_user_id_idx ON projection_scenarios (user_id);
CREATE INDEX projection_scenarios_household_id_idx ON projection_scenarios (household_id);

CREATE TABLE projection_scenario_month_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES projection_scenarios(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scenario_id, reference_month)
);

CREATE INDEX projection_scenario_month_values_scenario_id_idx
  ON projection_scenario_month_values (scenario_id);

ALTER TABLE projection_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE projection_scenario_month_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projection_scenarios_all" ON projection_scenarios FOR ALL
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)))
  WITH CHECK (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));

CREATE POLICY "projection_scenario_month_values_all" ON projection_scenario_month_values FOR ALL
  USING (EXISTS (
    SELECT 1 FROM projection_scenarios ps
    WHERE ps.id = scenario_id
      AND (ps.user_id = auth.uid() OR (ps.household_id IS NOT NULL AND is_household_member(ps.household_id)))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projection_scenarios ps
    WHERE ps.id = scenario_id
      AND (ps.user_id = auth.uid() OR (ps.household_id IS NOT NULL AND is_household_member(ps.household_id)))
  ));

-- Migrar monthly_variable_projection_cents existente para cenário "Padrão"
INSERT INTO projection_scenarios (user_id, household_id, scope, name, type, fixed_amount_cents, sort_order)
SELECT
  user_id,
  household_id,
  scope,
  'Padrão',
  'fixed',
  monthly_variable_projection_cents,
  0
FROM cash_flow_settings
WHERE monthly_variable_projection_cents > 0;
