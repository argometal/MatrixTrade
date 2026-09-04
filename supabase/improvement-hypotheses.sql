-- Improvement Hypotheses durable store (MXT 028).
-- Run in Supabase → SQL Editor (idempotent) to enable the relational path.
-- Until applied, cloud runtime falls back to Storage bucket mxt-artifacts
-- (same interim pattern as Thesis T0 freezes).
--
-- SAFETY: Additive create only. Does not alter Plans / MAF / Playbooks / Mechanics.
-- ImprovementHypothesis ≠ MafExperiment (attribution lifecycle).

create table if not exists public.improvement_hypotheses (
  id text primary key,
  status text not null check (
    status in (
      'proposed',
      'testing',
      'supported',
      'rejected',
      'insufficient_evidence',
      'method_change_authorized'
    )
  ),
  ticker text not null,
  component_id text not null,
  candidate_label text not null,
  candidate_kind text not null check (
    candidate_kind in ('technique', 'parameter', 'process', 'other')
  ),
  applicability text not null,
  change_under_test text not null,
  origin_plan_id text not null,
  origin_maf_experiment_id text not null,
  origin_case_equation_id text,
  playbook_id text,
  evidence_plan_ids jsonb not null default '[]'::jsonb,
  notes text,
  authorized_for_testing_at timestamptz,
  method_change_authorized_at timestamptz,
  method_change_authorization_note text,
  evidence_verdict_set_at timestamptz,
  evidence_verdict_note text,
  source text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists improvement_hypotheses_ticker_idx
  on public.improvement_hypotheses (ticker);

create index if not exists improvement_hypotheses_origin_plan_id_idx
  on public.improvement_hypotheses (origin_plan_id);

create index if not exists improvement_hypotheses_status_idx
  on public.improvement_hypotheses (status);

create index if not exists improvement_hypotheses_updated_at_idx
  on public.improvement_hypotheses (updated_at desc);

comment on table public.improvement_hypotheses is
  'MXT 028 Improvement Hypotheses (IH-{TICKER}-NNN). Prospective method-change tests — never auto-mutate Playbooks.';

alter table public.improvement_hypotheses enable row level security;
revoke all on table public.improvement_hypotheses from anon, authenticated;

notify pgrst, 'reload schema';
