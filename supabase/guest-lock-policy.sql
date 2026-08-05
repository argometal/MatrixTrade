-- Guest workstation lock policy — account-wide schedule (single JSON row).
-- Non-destructive. Run in Supabase → SQL Editor (idempotent).

create table if not exists public.guest_lock_policy_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.guest_lock_policy_state is
  'Guest workstation lock: enabled, hours, daily window, date range. Shared across all browsers/devices for this deploy.';

alter table public.guest_lock_policy_state enable row level security;
revoke all on table public.guest_lock_policy_state from anon, authenticated;

notify pgrst, 'reload schema';
