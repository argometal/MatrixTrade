import type {
  ContactValueKey,
  MyValueKey,
  RelationshipReasonKey,
  RelationshipStatusKey,
} from "./network-relationship-metrics";

export type EntityType = "person" | "company" | "project" | "other";

export type JournalKind = "log" | "event" | "follow_up";

export type LogSource = "manual" | "inbox" | "email" | "file";

export type InboxSource = "manual" | "api" | "email" | "file";

export type InboxStatus = "pending" | "linked" | "converted" | "archived";

export type ClassificationStatus = "classified" | "needs_classification";

export type AttachmentParentType = "inbox" | "journal";

export type StrategicValue = 1 | 2 | 3 | 4 | 5;

/** Entity visibility — archived excludes from metrics and default browse. */
export type EntityLifecycleStatus = "active" | "completed" | "archived";

export type { ContactValueKey, MyValueKey, RelationshipReasonKey, RelationshipStatusKey };

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  alias?: string;
  notes: string;
  /** @deprecated Legacy 1–5 rating; use contactValue / myValue instead. */
  strategicValue: StrategicValue;
  /** What this contact consistently brings to me. */
  contactValue?: ContactValueKey[];
  /** What I consistently bring to this contact. */
  myValue?: MyValueKey[];
  /** @deprecated Derived at read time — not persisted. */
  relationshipStatus?: RelationshipStatusKey;
  /** @deprecated Derived at read time — not persisted. */
  relationshipReason?: RelationshipReasonKey;
  /** Project date range (YYYY-MM-DD) — relations only, not duplicate evidence */
  startDate?: string;
  endDate?: string;
  /** Person/company entity IDs linked to this project */
  linkedPersonIds?: string[];
  /** Topic entity IDs linked to this project */
  linkedTopicIds?: string[];
  /** Event entity IDs linked to this project (filtered by project date range in UI) */
  linkedEventIds?: string[];
  /** Outbound entity links for person, organization, topic, and event records */
  linkedEntityIds?: string[];
  /**
   * @deprecated Legacy untyped binder tags. Prefer projectTags / topicTags / eventTags.
   * Dual-read only during ORDER 001 migration — do not use for new mixed semantics.
   */
  linkedTags?: string[];
  /** Project classification tags (`TagRole: project`). */
  projectTags?: string[];
  /** Topic classification tags (`TagRole: topic`). Dual-writes linkedTags during migration. */
  topicTags?: string[];
  /** Event binder classification (`TagRole: event`). Not evidence Tags; not legacy Signals. */
  eventTags?: string[];
  /** active | completed (project past end) | archived (hidden from metrics) */
  lifecycleStatus?: EntityLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  /** Soft delete — never hard-remove user data (Rule 0). */
  deletedAt?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  parentType: AttachmentParentType;
  parentId: string;
  /** Soft delete — never hard-remove user data (Rule 0). */
  deletedAt?: string;
}

/** Journal record — source of truth for logs, events, and follow-ups */
export interface Log {
  id: string;
  kind: JournalKind;
  date: string;
  title: string;
  body: string;
  entityIds: string[];
  /** classified = linked entities; needs_classification = capture deferred */
  classificationStatus: ClassificationStatus;
  private: boolean;
  source: LogSource;
  attachmentIds: string[];
  inboxItemId?: string;
  /** When to revisit (follow_up kind) */
  followUpDate?: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  /** Soft delete — never hard-remove user data (Rule 0). */
  deletedAt?: string;
}

export interface InboxItem {
  id: string;
  receivedAt: string;
  source: InboxSource;
  rawText: string;
  rawEmail?: string;
  subject?: string;
  from?: string;
  to?: string;
  attachmentIds: string[];
  /** References (entities) this inbox item is linked to — handover, topic, person, etc. */
  linkedEntityIds?: string[];
  /** When true, hidden until ARGUS private PIN unlock. */
  private?: boolean;
  status: InboxStatus;
  /** User-set revisit date while triaging (YYYY-MM-DD). */
  followUpDate?: string;
  /** User-selected tags only — suggestions are not auto-saved here. */
  topics?: string[];
  convertedLogId?: string;
  createdAt: string;
  /** Soft delete — never hard-remove user data (Rule 0). */
  deletedAt?: string;
}

/** item = check; section = named category header; sep = blank divider (legacy). */
export type RunbookItemType = "item" | "section" | "sep";

/** Optional nested check under a checklist item (legacy; prefer flat checks). */
export interface RunbookSubtask {
  id: string;
  text: string;
  done: boolean;
  doneAt: string;
}

/** One checklist row in a Runbook template (not a “card” / task board unit). */
export interface RunbookItem {
  id: string;
  text: string;
  /** Template default only — execution progress lives in RunbookProgress per entity. */
  done: boolean;
  doneAt: string;
  type: RunbookItemType;
  subtasks?: RunbookSubtask[];
}

/**
 * Shared checklist template (Execution).
 * Link to Organization / Project / Topic / Event via linkedEntityIds.
 * Per-level check state is RunbookProgress — not stored on items when executing in scope.
 */
export interface Runbook {
  id: string;
  title: string;
  items: RunbookItem[];
  linkedEntityIds: string[];
  /**
   * Classification metadata — existing ARGUS tag strings (same keys as evidence/binder Tags).
   * Not a TagRole. Not evidence. Patterns still derive only from evidence Tags.
   */
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Check + closed state for one Runbook at one entity level (Project / Topic / Event / Org). */
export interface RunbookProgress {
  id: string;
  runbookId: string;
  entityId: string;
  /** checkId (item id) → done state */
  checks: Record<string, { done: boolean; doneAt: string }>;
  /** Runbook marked complete/closed at this level */
  closed: boolean;
  updatedAt: string;
}

export interface ArgusData {
  entities: Entity[];
  logs: Log[];
  inboxItems: InboxItem[];
  attachments: Attachment[];
  runbooks: Runbook[];
  /** Execution progress per (runbook × entity). */
  runbookProgress?: RunbookProgress[];
  /**
   * Flagged Trackers (journal-level watchlist) — flags on Tag keys, not a TagRole.
   * Not auto-copied onto evidence.
   */
  signalTags?: string[];
  /** Cross-cutting Global Tags (`TagRole: global`). */
  globalTags?: string[];
  version: 3;
}

export type EntityInput = Omit<Entity, "id" | "createdAt" | "updatedAt">;
export type LogInput = Omit<Log, "id" | "createdAt" | "updatedAt">;
export type InboxItemInput = Omit<InboxItem, "id" | "receivedAt" | "status" | "createdAt" | "convertedLogId">;
export type RunbookInput = Omit<Runbook, "id" | "createdAt" | "updatedAt">;

/** Time-varying context slice derived from journal co-mentions */
export interface EntityContextSlice {
  periodStart: string;
  periodEnd?: string;
  coEntityIds: string[];
  logIds: string[];
}
