-- ARGUS Supabase — full setup (run this ONCE in Supabase SQL editor)
-- Order: inbox → journal → protection
-- Safe to re-run (idempotent).

-- =============================================================================
-- 1. INBOX (argus-inbox.sql)
-- =============================================================================

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

-- =============================================================================
-- 2. JOURNAL (argus-journal.sql)
-- =============================================================================

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

-- =============================================================================
-- 3. PROTECTION (argus-protection.sql)
-- =============================================================================

alter table public.argus_inbox_items
  add column if not exists deleted_at timestamptz;

alter table public.argus_attachments
  add column if not exists deleted_at timestamptz;

alter table public.argus_journal
  add column if not exists deleted_at timestamptz;

create index if not exists argus_inbox_items_active_idx
  on public.argus_inbox_items (received_at desc)
  where deleted_at is null;

create index if not exists argus_attachments_active_idx
  on public.argus_attachments (parent_type, parent_id)
  where deleted_at is null;

create or replace function public.argus_prevent_hard_delete()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('argus.allow_hard_delete', true), '') = 'on' then
    return old;
  end if;
  raise exception 'ARGUS Rule 0: hard DELETE blocked on %. Use soft delete (deleted_at).', tg_table_name;
end;
$$;

create or replace function public.argus_prevent_truncate()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('argus.allow_hard_delete', true), '') = 'on' then
    return null;
  end if;
  raise exception 'ARGUS Rule 0: TRUNCATE blocked on %. Use supabase/dev/argus-destructive-local-only.sql locally.', tg_table_name;
end;
$$;

drop trigger if exists argus_inbox_items_no_hard_delete on public.argus_inbox_items;
create trigger argus_inbox_items_no_hard_delete
  before delete on public.argus_inbox_items
  for each row execute function public.argus_prevent_hard_delete();

drop trigger if exists argus_attachments_no_hard_delete on public.argus_attachments;
create trigger argus_attachments_no_hard_delete
  before delete on public.argus_attachments
  for each row execute function public.argus_prevent_hard_delete();

drop trigger if exists argus_journal_no_hard_delete on public.argus_journal;
create trigger argus_journal_no_hard_delete
  before delete on public.argus_journal
  for each row execute function public.argus_prevent_hard_delete();

drop trigger if exists argus_inbox_items_no_truncate on public.argus_inbox_items;
create trigger argus_inbox_items_no_truncate
  before truncate on public.argus_inbox_items
  for each statement execute function public.argus_prevent_truncate();

drop trigger if exists argus_attachments_no_truncate on public.argus_attachments;
create trigger argus_attachments_no_truncate
  before truncate on public.argus_attachments
  for each statement execute function public.argus_prevent_truncate();

drop trigger if exists argus_journal_no_truncate on public.argus_journal;
create trigger argus_journal_no_truncate
  before truncate on public.argus_journal
  for each statement execute function public.argus_prevent_truncate();

alter table public.argus_inbox_items enable row level security;
alter table public.argus_attachments enable row level security;
alter table public.argus_journal enable row level security;

revoke all on table public.argus_inbox_items from anon, authenticated;
revoke all on table public.argus_attachments from anon, authenticated;
revoke all on table public.argus_journal from anon, authenticated;

drop policy if exists "argus_files_service_only_select" on storage.objects;
create policy "argus_files_service_only_select"
  on storage.objects for select
  using (bucket_id = 'argus-files' and auth.role() = 'service_role');

drop policy if exists "argus_files_service_only_insert" on storage.objects;
create policy "argus_files_service_only_insert"
  on storage.objects for insert
  with check (bucket_id = 'argus-files' and auth.role() = 'service_role');

drop policy if exists "argus_files_service_only_update" on storage.objects;
create policy "argus_files_service_only_update"
  on storage.objects for update
  using (bucket_id = 'argus-files' and auth.role() = 'service_role');

drop policy if exists "argus_files_service_only_delete" on storage.objects;
create policy "argus_files_service_only_delete"
  on storage.objects for delete
  using (bucket_id = 'argus-files' and auth.role() = 'service_role');

alter table public.argus_inbox_items
  add column if not exists private boolean not null default false;

select 'ARGUS setup complete: argus_inbox_items, argus_attachments, argus_journal, protection applied.' as status;
