-- MatrixTrade / ARGUS — fix Supabase Advisor: rls_disabled_in_public
-- Project: matrix-trade (anyone with the anon URL must NOT read/write tables).
--
-- Context:
--   The Next.js app uses SUPABASE_SERVICE_ROLE_KEY server-side only
--   (createSupabaseAdmin). service_role bypasses RLS by design.
--   Direct anon / authenticated PostgREST access must be denied.
--
-- Pattern (same as supabase/argus-protection.sql):
--   1) ENABLE ROW LEVEL SECURITY on every public table
--   2) REVOKE ALL from anon + authenticated
--   3) No permissive policies for anon/authenticated
--
-- Safe to re-run. Apply in Supabase → SQL Editor (production).

-- ---------------------------------------------------------------------------
-- 1. Lock down every existing public base table
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select c.oid, format('%I.%I', n.nspname, c.relname) as fqname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r' -- ordinary tables only
      and c.relname not like 'pg_%'
  loop
    execute format('alter table %s enable row level security', r.fqname);

    begin
      execute format('revoke all on table %s from anon', r.fqname);
    exception
      when undefined_object then null;
    end;

    begin
      execute format('revoke all on table %s from authenticated', r.fqname);
    exception
      when undefined_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Known MatrixTrade + ARGUS tables (explicit — documents intent; no-op if missing)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  tables text[] := array[
    -- Matrix / trading
    'playbooks',
    'trades',
    'trade_plans',
    'stock_theses',
    'market_evidence',
    'scoped_ai_grants',
    'observations',
    'learning_outcomes',
    'external_positions',
    'capital_planner_state',
    'guest_lock_policy_state',
    'applied_import_fingerprints',
    'trading_inbox',
    'ai_sessions',
    'ai_notes',
    -- ARGUS operational
    'argus_inbox_items',
    'argus_attachments',
    'argus_journal',
    -- ARGUS v01 (if applied)
    'argus_organizations',
    'argus_people',
    'argus_projects',
    'argus_project_milestones',
    'argus_topics',
    'argus_tags',
    'argus_events',
    'argus_evidence',
    'argus_topic_tag_review_queue',
    'argus_evidence_projects',
    'argus_evidence_topics',
    'argus_evidence_events',
    'argus_evidence_people',
    'argus_evidence_organizations',
    'argus_evidence_tags',
    'argus_event_participants'
  ];
begin
  foreach t in array tables
  loop
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    begin
      execute format('revoke all on table public.%I from anon, authenticated', t);
    exception
      when undefined_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Default privileges — new tables in public stay locked for anon/auth
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    execute 'alter default privileges in schema public revoke all on tables from anon';
  exception
    when undefined_object then null;
  end;
  begin
    execute 'alter default privileges in schema public revoke all on tables from authenticated';
  exception
    when undefined_object then null;
  end;
  begin
    execute 'alter default privileges in schema public revoke all on sequences from anon';
  exception
    when undefined_object then null;
  end;
  begin
    execute 'alter default privileges in schema public revoke all on sequences from authenticated';
  exception
    when undefined_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Audit helper for service_role / verify tool
-- ---------------------------------------------------------------------------

create or replace function public.matrixtrade_rls_audit()
returns table(table_name text, rls_enabled boolean)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select c.relname::text as table_name,
         c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by 1;
$$;

revoke all on function public.matrixtrade_rls_audit() from public;
revoke all on function public.matrixtrade_rls_audit() from anon;
revoke all on function public.matrixtrade_rls_audit() from authenticated;
grant execute on function public.matrixtrade_rls_audit() to service_role;

-- ---------------------------------------------------------------------------
-- 5. Immediate audit (run result should show rls_enabled = true for all rows)
-- ---------------------------------------------------------------------------

select table_name, rls_enabled
from public.matrixtrade_rls_audit()
order by rls_enabled asc, table_name;

-- Tables still open (must be empty after this script):
select table_name
from public.matrixtrade_rls_audit()
where rls_enabled = false;
