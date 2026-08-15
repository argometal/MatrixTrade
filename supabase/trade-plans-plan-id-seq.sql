-- PROMPT 15-01 — Scout Plan ID architecture
-- Widen CHECK from exactly 3 digits to PLAN-<digits>+ (min pad is app-level).
-- Add global sequence + allocate_trade_plan_id() for concurrency-safe allocation.
-- Run in Supabase SQL Editor when TRADES_STORE=supabase.
-- Preserves existing rows (PLAN-001 …); no renumbering.

-- 1) Relax id CHECK (drop legacy 3-digit-only constraint, add unbounded digits)
do $$
declare
  cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'trade_plans'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%PLAN%'
  loop
    execute format('alter table public.trade_plans drop constraint %I', cname);
  end loop;
end $$;

alter table public.trade_plans
  add constraint trade_plans_id_format_check
  check (id ~ '^PLAN-[0-9]+$');

-- 2) Global sequence (never ticker-scoped)
create sequence if not exists public.trade_plan_id_seq;

-- Sync high-water to max existing PLAN-<n> (or 0 if empty)
select setval(
  'public.trade_plan_id_seq',
  greatest(
    coalesce(
      (
        select max(substring(id from 6)::bigint)
        from public.trade_plans
        where id ~ '^PLAN-[0-9]+$'
      ),
      0
    ),
    0
  ),
  true
);

-- 3) Allocate next id: min 3-digit pad, no max length (PLAN-999 → PLAN-1000)
create or replace function public.allocate_trade_plan_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
  body text;
begin
  n := nextval('public.trade_plan_id_seq');
  body := n::text;
  if char_length(body) < 3 then
    body := lpad(body, 3, '0');
  end if;
  return 'PLAN-' || body;
end;
$$;

revoke all on function public.allocate_trade_plan_id() from public;
grant execute on function public.allocate_trade_plan_id() to service_role;

comment on function public.allocate_trade_plan_id() is
  'Global Scout Plan ID allocator. Returns PLAN-<n> with min 3-digit padding.';
