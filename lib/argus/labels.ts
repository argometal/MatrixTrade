import type { EntityType, InboxSource, InboxStatus, JournalKind, LogSource, StrategicValue } from "./types";
import type { RelationshipHealth } from "./network-intelligence";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: "Person",
  company: "Organization",
  project: "Project",
  other: "Reference",
};

/** Storage types creatable via reference UI — Topic/Event use type `other` + Kind notes. */
export const ENTITY_TYPES: EntityType[] = ["person", "company", "project"];

export const JOURNAL_KIND_LABELS: Record<JournalKind, string> = {
  log: "Note",
  event: "Update",
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

export const INBOX_STATUS_LABELS: Record<InboxStatus, string> = {
  pending: "Pending",
  linked: "Linked",
  converted: "Converted",
  archived: "Archived",
};

export const STRATEGIC_VALUE_LABELS: Record<StrategicValue, string> = {
  1: "Low — maintain occasionally",
  2: "Useful — keep alive",
  3: "Normal — regular contact",
  4: "High — prioritize periodically",
  5: "Strategic — protect relationship",
};

export const RELATIONSHIP_HEALTH_LABELS: Record<RelationshipHealth, string> = {
  active: "Active",
  cooling: "Cooling",
  dormant: "Dormant",
  neglected: "Neglected",
};

export const RELATIONSHIP_HEALTH_COLORS: Record<RelationshipHealth, string> = {
  active: "text-teal-400",
  cooling: "text-sky-400",
  dormant: "text-zinc-500",
  neglected: "text-amber-400",
};
