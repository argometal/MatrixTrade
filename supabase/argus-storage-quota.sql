-- ARGUS storage quota helper — run in Supabase SQL editor
-- Used by lib/argus/storage/quota-report.ts via rpc('argus_db_bytes')

create or replace function public.argus_db_bytes()
returns bigint
language sql
security definer
set search_path = public
as $$
  select coalesce(
    sum(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))),
    0
  )::bigint
  from pg_tables
  where schemaname = 'public'
    and tablename like 'argus_%';
$$;

revoke all on function public.argus_db_bytes() from public;
grant execute on function public.argus_db_bytes() to service_role;
