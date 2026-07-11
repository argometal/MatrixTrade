-- Post-stop study + loss classification on trades (asymmetry learning loop)
-- Run when TRADES_STORE=supabase. Idempotent.

alter table public.trades
  add column if not exists loss_classification text,
  add column if not exists post_stop_study jsonb;
