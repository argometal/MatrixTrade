-- ARGUS DESTRUCTIVE — LOCAL / DEV ONLY
-- NEVER run on production Supabase.
-- Requires explicit session flag before hard delete or truncate:
--   SET argus.allow_hard_delete = on;

-- Example (local dev reset only):
--   SET argus.allow_hard_delete = on;
--   TRUNCATE public.argus_inbox_items, public.argus_attachments CASCADE;
--   UPDATE public.argus_journal SET data = '{"entities":[],"logs":[],"inboxItems":[],"attachments":[],"version":3}'::jsonb WHERE id = 'primary';
--   RESET argus.allow_hard_delete;

-- Hard-delete bypass (single row):
--   SET argus.allow_hard_delete = on;
--   DELETE FROM public.argus_inbox_items WHERE id = '...';
--   RESET argus.allow_hard_delete;

select 'Read-only reminder: destructive ARGUS SQL is local/dev only. Set argus.allow_hard_delete = on to bypass triggers.' as notice;
