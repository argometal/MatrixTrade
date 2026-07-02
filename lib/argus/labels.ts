import type { EntityType, InboxSource, JournalKind, LogSource } from "./types";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: "Person",
  company: "Company",
  project: "Project",
  other: "Other",
};

export const ENTITY_TYPES: EntityType[] = ["person", "company", "project", "other"];

export const JOURNAL_KIND_LABELS: Record<JournalKind, string> = {
  log: "Log",
  event: "Event",
  follow_up: "Follow-up",
};

export const JOURNAL_KINDS: JournalKind[] = ["log", "event", "follow_up"];

export const LOG_SOURCE_LABELS: Record<LogSource, string> = {
  manual: "Manual",
  inbox: "Inbox",
  email: "Email",
  file: "File",
};

export const INBOX_SOURCE_LABELS: Record<InboxSource, string> = {
  manual: "Manual",
  api: "API",
  email: "Email",
  file: "File",
};

export const INBOX_SOURCES: InboxSource[] = ["manual", "api", "email", "file"];
