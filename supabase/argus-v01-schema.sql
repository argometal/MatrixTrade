-- ARGUS Knowledge Model v01 — Postgres DDL (DRAFT FOR REVIEW ONLY)
-- Canonical design: md/argus/knowledge-model-v01.md
-- Phase 1 scope: schema only. No migration scripts. No UI. No RLS policies yet.
--
-- Apply only after schema review is approved.
-- Does not alter existing argus_inbox_items / JSON store behavior.

-- ---------------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- ---------------------------------------------------------------------------

create or replace function public.argus_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Domain tables
-- ---------------------------------------------------------------------------

create table if not exists public.argus_organizations (
  id text primary key,
  name text not null,
  alias text not null default '',
  notes text not null default '',
  strategic_value smallint check (strategic_value is null or strategic_value between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.argus_people (
  id text primary key,
  name text not null,
  alias text not null default '',
  notes text not null default '',
  strategic_value smallint check (strategic_value is null or strategic_value between 1 and 5),
  organization_id text references public.argus_organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists argus_people_organization_id_idx
  on public.argus_people (organization_id);

create table if not exists public.argus_projects (
  id text primary key,
  name text not null,
  objective text not null default '',
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'archived')),
  start_date date,
  end_date date,
  owner_person_id text references public.argus_people (id) on delete set null,
  owner_organization_id text references public.argus_organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists argus_projects_status_idx on public.argus_projects (status);
create index if not exists argus_projects_owner_person_id_idx on public.argus_projects (owner_person_id);
create index if not exists argus_projects_owner_organization_id_idx
  on public.argus_projects (owner_organization_id);

create table if not exists public.argus_project_milestones (
  id text primary key,
  project_id text not null references public.argus_projects (id) on delete cascade,
  title text not null,
  target_date date,
  status text not null default 'open'
    check (status in ('open', 'done', 'cancelled')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists argus_project_milestones_project_id_idx
  on public.argus_project_milestones (project_id, sort_order);

create table if not exists public.argus_topics (
  id text primary key,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint argus_topics_name_unique unique (name)
);

create table if not exists public.argus_tags (
  id text primary key,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint argus_tags_name_unique unique (name),
  constraint argus_tags_slug_unique unique (slug)
);

create table if not exists public.argus_events (
  id text primary key,
  name text not null,
  occurred_at timestamptz not null,
  location text,
  duration interval,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists argus_events_occurred_at_idx
  on public.argus_events (occurred_at desc);

-- Evidence: single center of the system. Body is editable in v01.
-- Document is an evidence_type, not a separate domain entity.
-- Place is deferred (optional free-text location lives on argus_events.location).
create table if not exists public.argus_evidence (
  id text primary key,
  evidence_type text not null check (evidence_type in (
    'note',
    'email',
    'pdf',
    'photo',
    'voice',
    'file',
    'document',
    'screenshot',
    'bookmark',
    'chat',
    'video'
  )),
  title text not null default '',
  body text not null default '',
  captured_at timestamptz not null default now(),
  source text not null default 'manual'
    check (source in ('manual', 'email', 'api', 'file', 'inbox')),
  private boolean not null default false,
  follow_up_at timestamptz,
  -- Email/intake workflow only. Not a domain entity.
  intake_status text check (intake_status is null or intake_status in (
    'pending', 'linked', 'archived'
  )),
  storage_key text,
  mime_type text,
  file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists argus_evidence_captured_at_idx
  on public.argus_evidence (captured_at desc);
create index if not exists argus_evidence_evidence_type_idx
  on public.argus_evidence (evidence_type);
create index if not exists argus_evidence_follow_up_at_idx
  on public.argus_evidence (follow_up_at)
  where follow_up_at is not null;
create index if not exists argus_evidence_intake_status_idx
  on public.argus_evidence (intake_status)
  where intake_status is not null;

-- Manual review queue for legacy log.topics[] — no automatic Topic/Tag split.
create table if not exists public.argus_topic_tag_review_queue (
  id text primary key,
  raw_string text not null,
  status text not null default 'pending'
    check (status in ('pending', 'resolved_topic', 'resolved_tag', 'dismissed')),
  evidence_id text references public.argus_evidence (id) on delete cascade,
  legacy_log_id text,
  resolved_topic_id text references public.argus_topics (id) on delete set null,
  resolved_tag_id text references public.argus_tags (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (evidence_id is not null or legacy_log_id is not null),
  check (
    status = 'pending'
    or status = 'dismissed'
    or (status = 'resolved_topic' and resolved_topic_id is not null)
    or (status = 'resolved_tag' and resolved_tag_id is not null)
  )
);

create index if not exists argus_topic_tag_review_queue_status_idx
  on public.argus_topic_tag_review_queue (status);
create index if not exists argus_topic_tag_review_queue_evidence_id_idx
  on public.argus_topic_tag_review_queue (evidence_id);
create index if not exists argus_topic_tag_review_queue_legacy_log_id_idx
  on public.argus_topic_tag_review_queue (legacy_log_id);

-- ---------------------------------------------------------------------------
-- Relationship tables (graph edges — no arrays on domain rows)
-- ---------------------------------------------------------------------------

create table if not exists public.argus_evidence_projects (
  evidence_id text not null references public.argus_evidence (id) on delete cascade,
  project_id text not null references public.argus_projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (evidence_id, project_id)
);

create index if not exists argus_evidence_projects_project_id_idx
  on public.argus_evidence_projects (project_id);

create table if not exists public.argus_evidence_topics (
  evidence_id text not null references public.argus_evidence (id) on delete cascade,
  topic_id text not null references public.argus_topics (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (evidence_id, topic_id)
);

create index if not exists argus_evidence_topics_topic_id_idx
  on public.argus_evidence_topics (topic_id);

create table if not exists public.argus_evidence_events (
  evidence_id text not null references public.argus_evidence (id) on delete cascade,
  event_id text not null references public.argus_events (id) on delete cascade,
  role text not null default 'generated_from'
    check (role in ('generated_from', 'related')),
  created_at timestamptz not null default now(),
  primary key (evidence_id, event_id)
);

create index if not exists argus_evidence_events_event_id_idx
  on public.argus_evidence_events (event_id);

create table if not exists public.argus_evidence_people (
  evidence_id text not null references public.argus_evidence (id) on delete cascade,
  person_id text not null references public.argus_people (id) on delete cascade,
  role text not null default 'mentioned'
    check (role in ('mentioned', 'author', 'participant')),
  created_at timestamptz not null default now(),
  primary key (evidence_id, person_id, role)
);

create index if not exists argus_evidence_people_person_id_idx
  on public.argus_evidence_people (person_id);

create table if not exists public.argus_evidence_organizations (
  evidence_id text not null references public.argus_evidence (id) on delete cascade,
  organization_id text not null references public.argus_organizations (id) on delete cascade,
  role text not null default 'mentioned'
    check (role in ('mentioned', 'subject')),
  created_at timestamptz not null default now(),
  primary key (evidence_id, organization_id, role)
);

create index if not exists argus_evidence_organizations_organization_id_idx
  on public.argus_evidence_organizations (organization_id);

create table if not exists public.argus_evidence_tags (
  evidence_id text not null references public.argus_evidence (id) on delete cascade,
  tag_id text not null references public.argus_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (evidence_id, tag_id)
);

create index if not exists argus_evidence_tags_tag_id_idx
  on public.argus_evidence_tags (tag_id);

create table if not exists public.argus_event_participants (
  event_id text not null references public.argus_events (id) on delete cascade,
  person_id text not null references public.argus_people (id) on delete cascade,
  role text not null default 'attendee'
    check (role in ('attendee', 'host', 'speaker')),
  created_at timestamptz not null default now(),
  primary key (event_id, person_id, role)
);

create index if not exists argus_event_participants_person_id_idx
  on public.argus_event_participants (person_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger argus_organizations_set_updated_at
  before update on public.argus_organizations
  for each row execute function public.argus_set_updated_at();

create trigger argus_people_set_updated_at
  before update on public.argus_people
  for each row execute function public.argus_set_updated_at();

create trigger argus_projects_set_updated_at
  before update on public.argus_projects
  for each row execute function public.argus_set_updated_at();

create trigger argus_project_milestones_set_updated_at
  before update on public.argus_project_milestones
  for each row execute function public.argus_set_updated_at();

create trigger argus_topics_set_updated_at
  before update on public.argus_topics
  for each row execute function public.argus_set_updated_at();

create trigger argus_events_set_updated_at
  before update on public.argus_events
  for each row execute function public.argus_set_updated_at();

create trigger argus_evidence_set_updated_at
  before update on public.argus_evidence
  for each row execute function public.argus_set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage (binaries referenced by argus_evidence.storage_key)
-- Reuses existing bucket from argus-inbox.sql when present.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('argus-files', 'argus-files', false)
on conflict (id) do nothing;
