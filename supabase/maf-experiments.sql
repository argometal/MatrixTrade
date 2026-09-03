-- Matrix Attribution Framework durable store (MXT 017-P14B-02).
-- Run in Supabase → SQL Editor (idempotent).
-- Replaces ephemeral /var/task/data/maf-experiments.json on Vercel / supabase Matrix store.
--
-- SAFETY: Additive create only. Does not alter Trades / Observations / Learning Outcomes.
-- Does not rewrite existing LO.maf_experiment_id semantics.

create table if not exists public.maf_experiments (
  id text primary key,
  trade_id text,
  plan_id text,
  playbook_id text,
  evaluation_id text,
  learning_outcome_id text,
  observation_id text,
  ticker text not null,
  status text not null check (status in ('collecting', 'attributed', 'concluded')),
  evidence jsonb not null default '{}'::jsonb,
  attributions jsonb not null default '[]'::jsonb,
  rule_hints jsonb,
  summary text,
  primary_drag_component text,
  human_approved boolean,
  observation_notes text,
  source text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

-- One MAF experiment per filled trade.
create unique index if not exists maf_experiments_trade_id_uidx
  on public.maf_experiments (trade_id)
  where trade_id is not null;

-- One plan-only MAF experiment when no trade fill.
create unique index if not exists maf_experiments_plan_id_uidx
  on public.maf_experiments (plan_id)
  where plan_id is not null and trade_id is null;

create index if not exists maf_experiments_ticker_idx
  on public.maf_experiments (ticker);

create index if not exists maf_experiments_learning_outcome_id_idx
  on public.maf_experiments (learning_outcome_id);

create index if not exists maf_experiments_observation_id_idx
  on public.maf_experiments (observation_id);

create index if not exists maf_experiments_updated_at_idx
  on public.maf_experiments (updated_at desc);

comment on table public.maf_experiments is
  'MAF attribution experiments (MAF-{TICKER}-NNN). Durable replacement for data/maf-experiments.json.';

alter table public.maf_experiments enable row level security;
revoke all on table public.maf_experiments from anon, authenticated;

notify pgrst, 'reload schema';
