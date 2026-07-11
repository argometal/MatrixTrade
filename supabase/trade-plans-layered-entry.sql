-- Layered entry / execution method on trade plans (entry optimization experiments)
-- Run in Supabase SQL Editor when TRADES_STORE=supabase. Idempotent.

alter table public.trade_plans
  add column if not exists layered_entry jsonb,
  add column if not exists execution_method text;
