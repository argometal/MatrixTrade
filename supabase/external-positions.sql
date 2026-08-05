-- External Positions (26-13 / hardened 26-14) — capital outside Scout→Trade pipeline.
-- Run in Supabase → SQL Editor (idempotent).
-- Does not modify Scout / Trade / Playbook records.
--
-- Cost basis: average_cost only. FIFO / specific-lot not implemented.
-- Sale proceeds: pending_settlement → settled (ledger); never auto-added from cumulative totals.

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
  cost_basis_method text not null default 'average_cost' check (
    cost_basis_method in ('average_cost')
  ),
  cost_basis numeric not null,
  current_price numeric,
  current_market_value numeric,
  unrealized_pnl numeric,
  unrealized_pnl_percent numeric,
  valuation_source text check (
    valuation_source is null
    or valuation_source in ('manual', 'import', 'unspecified')
  ),
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
  cumulative_sale_proceeds numeric not null default 0,
  cumulative_realized_pnl numeric not null default 0,
  revision integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint external_positions_experiment_false check (experiment_eligible = false),
  constraint external_positions_scout_linked_false check (scout_linked = false)
);

-- Harden existing deployments (26-14)
alter table public.external_positions
  add column if not exists cost_basis_method text;
alter table public.external_positions
  add column if not exists valuation_source text;
alter table public.external_positions
  add column if not exists cumulative_sale_proceeds numeric;
alter table public.external_positions
  add column if not exists revision integer;

-- Migrate legacy cumulative_released_proceeds → cumulative_sale_proceeds (informational only)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'external_positions'
      and column_name = 'cumulative_released_proceeds'
  ) then
    update public.external_positions
    set cumulative_sale_proceeds = coalesce(
      cumulative_sale_proceeds,
      cumulative_released_proceeds,
      0
    )
    where cumulative_sale_proceeds is null;
  end if;
end $$;

update public.external_positions
set cost_basis_method = coalesce(cost_basis_method, 'average_cost')
where cost_basis_method is null;

update public.external_positions
set cumulative_sale_proceeds = coalesce(cumulative_sale_proceeds, 0)
where cumulative_sale_proceeds is null;

update public.external_positions
set revision = coalesce(revision, 0)
where revision is null;

alter table public.external_positions
  alter column cost_basis_method set default 'average_cost';
alter table public.external_positions
  alter column cumulative_sale_proceeds set default 0;
alter table public.external_positions
  alter column revision set default 0;

create index if not exists external_positions_ticker_idx
  on public.external_positions (ticker);

create index if not exists external_positions_status_idx
  on public.external_positions (status);

create index if not exists external_positions_updated_at_idx
  on public.external_positions (updated_at desc);

comment on table public.external_positions is
  'External Position (EXT-xxx). Outside Scout→Trade. Excluded from experiment metrics. Capital Planner only. average_cost; settlement ledger in reductions jsonb.';

comment on column public.external_positions.cumulative_sale_proceeds is
  'Informational sum of sale proceeds (pending + settled). Never auto-added to settled cash.';

comment on column public.external_positions.reductions is
  'Array of reductions; each has settlementStatus pending_settlement|settled. Settled credits counted once in Capital Account.';

alter table public.external_positions enable row level security;
revoke all on table public.external_positions from anon, authenticated;

notify pgrst, 'reload schema';
