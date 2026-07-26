-- Learning Outcome durable store (CURSOR-MTA-LEARNING-OUTCOME-DURABLE-STORE-001).
-- Run in Supabase → SQL Editor (idempotent).
-- Replaces ephemeral /var/task/data/learning-outcomes.json on Vercel.
--
-- SAFETY: If the table already has data, run supabase/learning-outcomes-preflight.sql
-- FIRST. Unique index creation below WILL FAIL when duplicates exist.
-- Do not automatically delete/merge duplicates — resolve manually, then re-run.

create table if not exists public.learning_outcomes (
  id text primary key,
  kind text not null check (
    kind in (
      'executed_win',
      'executed_loss',
      'missed_opportunity',
      'cancelled',
      'expired',
      'unexecuted_plan_loss',
      'duplicate_creation'
    )
  ),
  ticker text not null,
  stock_thesis_id text,
  plan_id text,
  trade_id text,
  playbook_id text,
  observation_id text,
  maf_experiment_id text,
  r_achieved numeric,
  realized_r numeric,
  counterfactual_r numeric,
  realized_pnl numeric,
  counterfactual_dollar_result numeric,
  entry_reached boolean,
  stop_reached_before_target boolean,
  target_reached_before_stop boolean,
  non_execution_reason text,
  excluded_from_metrics boolean not null default false,
  lifecycle_status text not null check (
    lifecycle_status in (
      'open',
      'observing',
      'ready_for_attribution',
      'attributed',
      'concluded'
    )
  ),
  notes text,
  source text check (
    source is null
    or source in ('trade_close', 'plan_outcome', 'manual', 'ai')
  ),
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

-- Unique indexes (fail if duplicates exist — see learning-outcomes-preflight.sql).
-- One Scout-only Learning Outcome per plan (no trade fill).
create unique index if not exists learning_outcomes_plan_id_uidx
  on public.learning_outcomes (plan_id)
  where plan_id is not null and trade_id is null;

-- One Trade Learning Outcome per trade.
create unique index if not exists learning_outcomes_trade_id_uidx
  on public.learning_outcomes (trade_id)
  where trade_id is not null;

create index if not exists learning_outcomes_ticker_idx
  on public.learning_outcomes (ticker);

create index if not exists learning_outcomes_observation_id_idx
  on public.learning_outcomes (observation_id);

create index if not exists learning_outcomes_maf_experiment_id_idx
  on public.learning_outcomes (maf_experiment_id);

create index if not exists learning_outcomes_kind_idx
  on public.learning_outcomes (kind);

create index if not exists learning_outcomes_updated_at_idx
  on public.learning_outcomes (updated_at desc);

comment on table public.learning_outcomes is
  'Learning Outcome records (LO-xxx). Durable replacement for data/learning-outcomes.json.';

-- Diagnostic before applying unique indexes on an existing polluted table:
-- select plan_id, count(*) from public.learning_outcomes
--   where plan_id is not null and trade_id is null
--   group by plan_id having count(*) > 1;
-- select trade_id, count(*) from public.learning_outcomes
--   where trade_id is not null
--   group by trade_id having count(*) > 1;

notify pgrst, 'reload schema';
