-- ARGUS Rule 0 — Supabase protection (run after argus-inbox.sql + argus-journal.sql)
-- Adds soft delete, RLS, hard-delete blocks. Safe to re-run (idempotent alters).

-- ---------------------------------------------------------------------------
-- 1. Soft delete columns
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 2. Block hard DELETE / TRUNCATE (dev bypass: SET argus.allow_hard_delete = on)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 3. Row Level Security — block direct anon/authenticated access
--    ARGUS app uses service role on server after cookie auth only.
-- ---------------------------------------------------------------------------

alter table public.argus_inbox_items enable row level security;
alter table public.argus_attachments enable row level security;
alter table public.argus_journal enable row level security;

revoke all on table public.argus_inbox_items from anon, authenticated;
revoke all on table public.argus_attachments from anon, authenticated;
revoke all on table public.argus_journal from anon, authenticated;

-- No permissive policies for anon/authenticated → denied.
-- service_role bypasses RLS (Supabase default).

-- ---------------------------------------------------------------------------
-- 4. Storage bucket — deny public/anon object access
-- ---------------------------------------------------------------------------

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
