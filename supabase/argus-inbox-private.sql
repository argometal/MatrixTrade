-- Add missing private column on argus_inbox_items (required for email intake on Supabase).
-- Safe to re-run. Also included in supabase/argus-setup.sql.

alter table public.argus_inbox_items
  add column if not exists private boolean not null default false;
