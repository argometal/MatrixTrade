-- AI session tokens (Phase AI-1/2) — run after schema.sql if table missing
create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  one_time boolean not null default false,
  used_at timestamptz,
  label text
);

create index if not exists ai_sessions_expires_at_idx on public.ai_sessions (expires_at);
create index if not exists ai_sessions_revoked_at_idx on public.ai_sessions (revoked_at);
