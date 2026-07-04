-- Trading inbox (AI Block / proposals) — run after schema.sql if table missing
create table if not exists public.trading_inbox (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'applied', 'rejected')),
  payload jsonb not null,
  source text
);

create index if not exists trading_inbox_status_idx on public.trading_inbox (status);
create index if not exists trading_inbox_received_at_idx on public.trading_inbox (received_at desc);
