-- Legacy date correction audit (Prompt 25-10F).
-- Run in Supabase → SQL Editor (idempotent).

alter table public.trades
  add column if not exists dates_reconstructed boolean not null default false,
  add column if not exists date_correction_note text,
  add column if not exists date_correction_audit jsonb not null default '[]'::jsonb;

comment on column public.trades.dates_reconstructed is
  'True when createdAt/closedAt were human-reconstructed via trade-update (not broker-verified).';
comment on column public.trades.date_correction_note is
  'Human rationale for the latest reconstructed-date correction.';
comment on column public.trades.date_correction_audit is
  'Append-only JSON array of prior createdAt/closedAt/postStop windows.';

notify pgrst, 'reload schema';
