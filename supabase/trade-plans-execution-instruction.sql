-- AI Plan Map execution instruction (explanation layer only).
-- Optional; run in Supabase SQL Editor when ready (idempotent).
-- Until applied, Matrix nests the string into decision / layered_entry jsonb.

alter table public.trade_plans
  add column if not exists execution_instruction text;

comment on column public.trade_plans.execution_instruction is
  'AI-authored Plan Map execution sentence. Explanation layer only — not a calculation source.';

notify pgrst, 'reload schema';
