-- Thesis T0 Freeze durable store (MXT 016/016a).
-- Run in Supabase → SQL Editor (idempotent, non-destructive).
-- Local JSON data/thesis-t0-freezes.json remains a lab/fallback mirror.
-- Until this table is applied, the app uses Storage bucket mxt-artifacts
-- (prefix thesis-t0-freezes/) as the interim canonical cloud twin.
-- Prefer this relational table once applied (app auto-detects).
--
-- SAFETY: Does not rewrite freeze payloads. App insert path is append-only for
-- new freezes; open-episode uniqueness is (stock_thesis_id) while status=open.

create table if not exists public.thesis_t0_freezes (
  id text primary key,
  stock_thesis_id text not null,
  t0 timestamptz not null,
  evaluation_horizon_ends_at timestamptz not null,
  evaluation_horizon_days integer not null check (evaluation_horizon_days > 0),
  evaluation_horizon_override boolean not null default false,
  belief_fingerprint text,
  plan_ids jsonb not null default '[]'::jsonb,
  stock jsonb not null,
  decision jsonb,
  plan jsonb not null,
  confidence text not null check (confidence in ('verified', 'partial', 'unavailable')),
  status text not null check (
    status in (
      'open',
      'closed_confirmed',
      'closed_partial',
      'closed_invalidated',
      'expired_inconclusive'
    )
  ),
  t1 timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists thesis_t0_freezes_stock_thesis_id_idx
  on public.thesis_t0_freezes (stock_thesis_id);

create index if not exists thesis_t0_freezes_status_idx
  on public.thesis_t0_freezes (status);

-- At most one open episode per stock_thesis_id (includes PLAN-ONLY:* anchors).
create unique index if not exists thesis_t0_freezes_open_stock_uidx
  on public.thesis_t0_freezes (stock_thesis_id)
  where status = 'open';
