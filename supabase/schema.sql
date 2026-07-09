-- MatrixTrade cloud-first schema (Phase 0)
-- Run once in Supabase SQL Editor or via CLI migration.

-- Playbooks (seed from data/playbooks.json)
create table if not exists public.playbooks (
  id text primary key,
  name text not null,
  status text not null check (status in ('TESTING', 'ACTIVE', 'RETIRED')),
  description text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trades (source of truth when TRADES_STORE=supabase)
create table if not exists public.trades (
  id text primary key check (id ~ '^H(0(0[1-9]|[12][0-9]|30))$'),
  ticker text not null,
  entry numeric not null,
  exit numeric,
  stop numeric not null,
  target numeric,
  shares integer not null check (shares > 0),
  status text not null check (status in ('pending', 'open', 'closed')),
  created_at timestamptz not null,
  closed_at timestamptz,
  setup_id text,
  playbook_id text references public.playbooks (id) on delete set null,
  setup text,
  direction text check (direction is null or direction in ('long', 'short')),
  planned_risk numeric,
  actual_risk numeric,
  risk_reward_planned numeric,
  risk_reward_actual numeric,
  mistakes text[] default '{}',
  quality_entry smallint check (quality_entry is null or (quality_entry between 1 and 5)),
  quality_exit smallint check (quality_exit is null or (quality_exit between 1 and 5)),
  quality_mgmt smallint check (quality_mgmt is null or (quality_mgmt between 1 and 5)),
  reviewed_at timestamptz,
  lesson text,
  action_item text,
  thesis text,
  psychology text,
  lessons text,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists trades_status_idx on public.trades (status);
create index if not exists trades_playbook_id_idx on public.trades (playbook_id);
create index if not exists trades_reviewed_at_idx on public.trades (reviewed_at);

-- Trade plans (pre-trade planning — see md/design/planning-module-proposal.md)
create table if not exists public.trade_plans (
  id text primary key check (id ~ '^PLAN-[0-9]{3}$'),
  ticker text not null,
  playbook_id text references public.playbooks (id) on delete set null,
  status text not null check (
    status in ('watching', 'ready', 'entered', 'skipped', 'failed', 'expired')
  ),
  analysis_timeframes jsonb not null default '[]'::jsonb,
  entry_timeframe text not null,
  planned_entry numeric,
  support_level numeric,
  stop_price numeric,
  target_price numeric,
  planned_rr numeric,
  valid_from timestamptz,
  valid_until timestamptz,
  thesis text,
  chat_notes text,
  linked_trade_id text references public.trades (id) on delete set null,
  outcome jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trade_plans_status_idx on public.trade_plans (status);
create index if not exists trade_plans_ticker_idx on public.trade_plans (ticker);
create index if not exists trade_plans_valid_until_idx on public.trade_plans (valid_until);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists playbooks_set_updated_at on public.playbooks;
create trigger playbooks_set_updated_at
  before update on public.playbooks
  for each row execute function public.set_updated_at();

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

drop trigger if exists trade_plans_set_updated_at on public.trade_plans;
create trigger trade_plans_set_updated_at
  before update on public.trade_plans
  for each row execute function public.set_updated_at();
