-- Post-stop study + loss classification on trades (asymmetry learning loop)
-- REQUIRED when MatrixTrade code writes lossClassification / postStopStudy.
-- Run in Supabase → SQL Editor (idempotent). Then reload schema if needed.

alter table public.trades
  add column if not exists loss_classification text,
  add column if not exists post_stop_study jsonb;

comment on column public.trades.loss_classification is
  'Asymmetry loss class (e.g. pending_study, thesis_wrong, timing). Optional until review.';
comment on column public.trades.post_stop_study is
  'JSONB post-stop study payload for closed losing trades.';

-- Notify PostgREST to refresh schema cache (Supabase hosted usually auto-reloads;
-- if upserts still complain about schema cache, wait ~10s or restart API).
notify pgrst, 'reload schema';
