-- Learning Outcomes unique-index preflight (READ-ONLY).
-- Run BEFORE creating unique indexes in supabase/learning-outcomes.sql
-- when the table may already contain data.
-- Do NOT delete or merge duplicates automatically — resolve manually.

-- Duplicate Scout-only rows by plan_id
select
  plan_id,
  count(*) as row_count,
  array_agg(id order by updated_at desc, id) as ids,
  array_agg(updated_at order by updated_at desc, id) as updated_ats
from public.learning_outcomes
where plan_id is not null
  and trade_id is null
group by plan_id
having count(*) > 1
order by plan_id;

-- Duplicate rows by trade_id
select
  trade_id,
  count(*) as row_count,
  array_agg(id order by updated_at desc, id) as ids,
  array_agg(updated_at order by updated_at desc, id) as updated_ats
from public.learning_outcomes
where trade_id is not null
group by trade_id
having count(*) > 1
order by trade_id;

-- Detail rows for any polluted plan_id groups
select id, plan_id, trade_id, kind, lifecycle_status, updated_at, created_at
from public.learning_outcomes
where plan_id in (
  select plan_id
  from public.learning_outcomes
  where plan_id is not null and trade_id is null
  group by plan_id
  having count(*) > 1
)
order by plan_id, updated_at desc, id;

-- Detail rows for any polluted trade_id groups
select id, plan_id, trade_id, kind, lifecycle_status, updated_at, created_at
from public.learning_outcomes
where trade_id in (
  select trade_id
  from public.learning_outcomes
  where trade_id is not null
  group by trade_id
  having count(*) > 1
)
order by trade_id, updated_at desc, id;
