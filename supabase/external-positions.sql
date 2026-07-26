-- External Positions (26-13) — capital outside Scout→Trade pipeline.
-- Run in Supabase → SQL Editor (idempotent).
-- Does not modify Scout / Trade / Playbook records.

create table if not exists public.external_positions (
  id text primary key,
  ticker text not null,
  status text not null check (
    status in ('open', 'partially_reduced', 'closed', 'archived')
  ),
  acquisition_source text not null check (
    acquisition_source in (
      'external_program',
      'legacy_holding',
      'transferred_position',
      'manual_external',
      'other'
    )
  ),
  shares numeric not null check (shares >= 0),
  average_cost numeric not null check (average_cost >= 0),
  cost_basis numeric not null,
  current_price numeric,
  current_market_value numeric,
  unrealized_pnl numeric,
  unrealized_pnl_percent numeric,
  capital_treatment text not null check (
    capital_treatment in ('invested', 'restricted', 'pending_release', 'released')
  ),
  liquidity_status text not null check (
    liquidity_status in ('liquid', 'restricted', 'unknown')
  ),
  experiment_eligible boolean not null default false,
  scout_linked boolean not null default false,
  opened_at timestamptz not null,
  last_valuation_at timestamptz,
  review_at timestamptz,
  notes text,
  exit_plan jsonb,
  reductions jsonb not null default '[]'::jsonb,
  cumulative_released_proceeds numeric not null default 0,
  cumulative_realized_pnl numeric not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint external_positions_experiment_false check (experiment_eligible = false),
  constraint external_positions_scout_linked_false check (scout_linked = false)
);

create index if not exists external_positions_ticker_idx
  on public.external_positions (ticker);

create index if not exists external_positions_status_idx
  on public.external_positions (status);

create index if not exists external_positions_updated_at_idx
  on public.external_positions (updated_at desc);

comment on table public.external_positions is
  'External Position (EXT-xxx). Outside Scout→Trade. Excluded from experiment metrics. Capital Planner only.';

notify pgrst, 'reload schema';
