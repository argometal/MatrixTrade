-- Legacy historical-absence flags for closed-trade completion (Prompt 25-F8).
-- Apply sentinels __legacy_none__ / __LEGACY_NONE__ must NOT be written into FK columns.
-- Run in Supabase → SQL Editor (idempotent).

alter table public.trades
  add column if not exists plan_id text,
  add column if not exists playbook_historically_absent boolean not null default false,
  add column if not exists plan_historically_absent boolean not null default false;

comment on column public.trades.plan_id is
  'Optional Scout PLAN link (PLAN-xxx). No FK — plans may live in JSON or cloud table.';
comment on column public.trades.playbook_historically_absent is
  'True when Apply recorded playbookId=__legacy_none__ (no invent link; playbook_id stays null).';
comment on column public.trades.plan_historically_absent is
  'True when Apply recorded planId=__LEGACY_NONE__ (no invent PLAN; plan_id stays null).';

notify pgrst, 'reload schema';
