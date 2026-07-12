-- Idempotent Apply fingerprints — same Supabase project, not a separate database.
-- Run after trading-inbox.sql. Safe to re-run.

create table if not exists public.applied_import_fingerprints (
  fingerprint text primary key,
  applied_at timestamptz not null default now(),
  result jsonb not null
);

create index if not exists applied_import_fingerprints_applied_at_idx
  on public.applied_import_fingerprints (applied_at desc);
