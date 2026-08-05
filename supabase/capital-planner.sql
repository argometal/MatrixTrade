-- Capital Planner state (26-15) — configuration, ledger, reservations.
-- Non-destructive. Does not alter External Positions or Monthly Risk.
-- Run in Supabase → SQL Editor (idempotent).

create table if not exists public.capital_planner_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.capital_planner_state is
  'Capital Planner document store: CapitalConfiguration + CapitalLedgerEvent[] + CapitalReservation[]. Model A cash_ledger.';

alter table public.capital_planner_state enable row level security;
revoke all on table public.capital_planner_state from anon, authenticated;

notify pgrst, 'reload schema';
