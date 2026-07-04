-- ARGUS Rule 0 — durable journal snapshot (v3 JSON blob, not v01 ontology)
-- Run in Supabase SQL editor alongside argus-inbox.sql

create table if not exists public.argus_journal (
  id text primary key default 'primary',
  data jsonb not null default '{"entities":[],"logs":[],"inboxItems":[],"attachments":[],"version":3}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists argus_journal_updated_at_idx on public.argus_journal (updated_at desc);

insert into public.argus_journal (id, data)
values (
  'primary',
  '{"entities":[],"logs":[],"inboxItems":[],"attachments":[],"version":3}'::jsonb
)
on conflict (id) do nothing;
