-- ARGUS inbox (email intake) — run in Supabase SQL editor after schema.sql
-- Phase 1: inbox items + attachment metadata; binaries in Storage bucket argus-files

create table if not exists public.argus_inbox_items (
  id text primary key,
  received_at timestamptz not null,
  source text not null check (source in ('manual', 'api', 'email', 'file')),
  raw_text text not null default '',
  raw_email text,
  subject text,
  from_address text,
  to_address text,
  attachment_ids text[] not null default '{}',
  linked_entity_ids text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'linked', 'converted', 'archived')),
  converted_log_id text,
  created_at timestamptz not null default now(),
  private boolean not null default false,
  deleted_at timestamptz
);

create index if not exists argus_inbox_items_status_idx on public.argus_inbox_items (status);
create index if not exists argus_inbox_items_received_at_idx on public.argus_inbox_items (received_at desc);

create table if not exists public.argus_attachments (
  id text primary key,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  created_at timestamptz not null default now(),
  parent_type text not null check (parent_type in ('inbox', 'journal')),
  parent_id text not null,
  storage_key text not null,
  deleted_at timestamptz
);

create index if not exists argus_attachments_parent_idx on public.argus_attachments (parent_type, parent_id);

insert into storage.buckets (id, name, public)
values ('argus-files', 'argus-files', false)
on conflict (id) do nothing;
