-- Counterfactual plan observation fields (CURSOR-MTA-PLAN-OUTCOME-LEARNING-001).
-- Run after supabase/observations.sql (idempotent).

alter table public.observations
  add column if not exists observation_kind text,
  add column if not exists learning_unit_kind text,
  add column if not exists entry_triggered boolean,
  add column if not exists stop_triggered boolean,
  add column if not exists target_triggered boolean,
  add column if not exists theoretical_result_r numeric,
  add column if not exists realized_result_r numeric,
  add column if not exists evidence_refs jsonb not null default '[]'::jsonb,
  add column if not exists conclusion_reason text,
  add column if not exists concluded_at timestamptz;

comment on column public.observations.observation_kind is
  'e.g. plan_counterfactual_observation — not a Missed Trade by default';
comment on column public.observations.learning_unit_kind is
  'e.g. triggered_unexecuted_plan';

notify pgrst, 'reload schema';
