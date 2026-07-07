-- Inbox triage fields: manual status companion data (follow-up + user-selected tags).
-- Safe to re-run.

alter table public.argus_inbox_items
  add column if not exists follow_up_date date,
  add column if not exists topics text[] not null default '{}';
