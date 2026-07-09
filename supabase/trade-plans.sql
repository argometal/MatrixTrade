-- Trade plans (pre-trade planning workspace)
-- Run in Supabase SQL Editor when TRADES_STORE=supabase.

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

drop trigger if exists trade_plans_set_updated_at on public.trade_plans;
create trigger trade_plans_set_updated_at
  before update on public.trade_plans
  for each row execute function public.set_updated_at();
