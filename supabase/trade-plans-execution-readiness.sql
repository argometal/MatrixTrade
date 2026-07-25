-- Execution readiness on trade_plans (architecture only; no auto broker submit).
-- Run in Supabase SQL Editor (idempotent).

alter table public.trade_plans
  add column if not exists execution_readiness text
  check (
    execution_readiness is null
    or execution_readiness in (
      'draft',
      'approved',
      'armed',
      'confirmation_required',
      'submitted',
      'cancelled',
      'expired'
    )
  );

comment on column public.trade_plans.execution_readiness is
  'Architecture-only. armed = alerts/order params prepared; NOT submitted. automaticExecutionEnabled=false.';

notify pgrst, 'reload schema';
