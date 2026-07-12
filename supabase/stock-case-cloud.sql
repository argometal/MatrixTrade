-- Stock-case cloud persistence (Vercel / TRADES_STORE=supabase)
-- Run after schema.sql. Idempotent.

-- 1. Stock profiles (Stock File / dossier)
create table if not exists public.stock_theses (
  id text primary key,
  ticker text not null,
  status text not null check (
    status in ('draft', 'watching', 'actionable', 'invalidated', 'archived')
  ),
  version integer not null default 1,
  style text not null default 'swing',
  thesis text not null,
  current_hypothesis text not null,
  notes text,
  historical_analysis jsonb not null default '[]'::jsonb,
  levels jsonb not null default '{}'::jsonb,
  risk_rules jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_theses_ticker_idx on public.stock_theses (ticker);
create index if not exists stock_theses_status_idx on public.stock_theses (status);

drop trigger if exists stock_theses_set_updated_at on public.stock_theses;
create trigger stock_theses_set_updated_at
  before update on public.stock_theses
  for each row execute function public.set_updated_at();

-- 2. Link trade plans to stock profiles + scout decision fields
alter table public.trade_plans
  add column if not exists stock_thesis_id text references public.stock_theses (id) on delete set null,
  add column if not exists decision jsonb,
  add column if not exists decision_history jsonb not null default '[]'::jsonb,
  add column if not exists scout_lifecycle text,
  add column if not exists probe jsonb,
  add column if not exists layered_entry jsonb,
  add column if not exists execution_method text;

create index if not exists trade_plans_stock_thesis_id_idx on public.trade_plans (stock_thesis_id);

-- 3. Market evidence stream
create table if not exists public.market_evidence (
  id text primary key,
  stock_profile_id text not null references public.stock_theses (id) on delete cascade,
  ticker text not null,
  timeframe text not null,
  category text not null check (
    category in (
      'structure',
      'volatility',
      'relative_strength',
      'volume',
      'regime',
      'catalyst',
      'level',
      'other'
    )
  ),
  value text not null,
  confidence smallint not null check (confidence between 0 and 100),
  source text not null check (source in ('human', 'ai', 'import', 'migration')),
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  superseded_by text,
  note text
);

create index if not exists market_evidence_profile_idx on public.market_evidence (stock_profile_id);
create index if not exists market_evidence_observed_idx on public.market_evidence (observed_at desc);

-- 4. Scoped AI grants (bootstrap + profile)
create table if not exists public.scoped_ai_grants (
  id text primary key,
  kind text not null default 'profile' check (kind in ('profile', 'bootstrap')),
  stock_profile_id text not null,
  ticker text not null,
  plan_id text,
  scopes text[] not null default '{read,propose}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  label text
);

create index if not exists scoped_ai_grants_expires_idx on public.scoped_ai_grants (expires_at);
