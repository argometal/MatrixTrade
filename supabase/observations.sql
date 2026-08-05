-- Observation Engine durable store (Prompt 25-115).
-- Run in Supabase → SQL Editor (idempotent).
-- Replaces ephemeral /var/task/data/observations.json on Vercel.

create table if not exists public.observations (
  id text primary key,
  learning_outcome_id text,
  trade_id text,
  plan_id text,
  ticker text not null,
  status text not null check (status in ('observing', 'concluded')),
  started_at timestamptz not null,
  ends_at timestamptz not null,
  duration_days integer not null check (duration_days > 0),
  reference_entry numeric,
  reference_stop numeric,
  reference_targets jsonb,
  thesis_invalidation_note text,
  target_reached boolean,
  target_reached_at timestamptz,
  thesis_invalidated boolean,
  invalidation_reached_at timestamptz,
  first_terminal_event text check (
    first_terminal_event is null
    or first_terminal_event in (
      'target',
      'invalidation',
      'window_end',
      'none',
      'inconclusive'
    )
  ),
  max_price numeric,
  min_price numeric,
  mfe numeric,
  mae numeric,
  mfe_mae_unit text check (mfe_mae_unit is null or mfe_mae_unit in ('price', 'r')),
  better_entry_available boolean,
  better_entry_price numeric,
  data_source text check (
    data_source is null
    or data_source in ('manual', 'ai', 'post_stop_study', 'market_feed')
  ),
  notes text,
  created_at timestamptz not null,
  last_updated_at timestamptz not null default now()
);

-- One ObservationRecord per atomic learning unit (trade fill or plan-only miss).
create unique index if not exists observations_trade_id_uidx
  on public.observations (trade_id)
  where trade_id is not null;

create unique index if not exists observations_plan_id_uidx
  on public.observations (plan_id)
  where plan_id is not null and trade_id is null;

create index if not exists observations_ticker_idx on public.observations (ticker);
create index if not exists observations_status_idx on public.observations (status);
create index if not exists observations_last_updated_at_idx
  on public.observations (last_updated_at desc);

comment on table public.observations is
  'Observation Engine records (OBS-xxx). Durable replacement for data/observations.json.';

alter table public.observations enable row level security;
revoke all on table public.observations from anon, authenticated;

notify pgrst, 'reload schema';
