-- AI Notes (paste workflow) — run after schema.sql if table missing
create table if not exists public.ai_notes (
  id uuid primary key default gen_random_uuid(),
  trade_id text references public.trades (id) on delete set null,
  snapshot_revision integer not null,
  note_date timestamptz not null default now(),
  note_type text not null check (
    note_type in ('analysis', 'risk', 'strategy', 'lesson', 'action')
  ),
  body text not null,
  proposal_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_notes_created_at_idx on public.ai_notes (created_at desc);
create index if not exists ai_notes_trade_id_idx on public.ai_notes (trade_id);
create index if not exists ai_notes_snapshot_revision_idx on public.ai_notes (snapshot_revision);
