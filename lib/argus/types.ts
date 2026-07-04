export type EntityType = "person" | "company" | "project" | "other";

export type JournalKind = "log" | "event" | "follow_up";

export type LogSource = "manual" | "inbox" | "email" | "file";

export type InboxSource = "manual" | "api" | "email" | "file";

export type InboxStatus = "pending" | "linked" | "converted" | "archived";

export type ClassificationStatus = "classified" | "needs_classification";

export type AttachmentParentType = "inbox" | "journal";

export type StrategicValue = 1 | 2 | 3 | 4 | 5;

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  alias?: string;
  notes: string;
  /** 1=low … 5=strategic. Default 3. Only user-editable network field besides alias/notes. */
  strategicValue: StrategicValue;
  /** Project date range (YYYY-MM-DD) — relations only, not duplicate evidence */
  startDate?: string;
  endDate?: string;
  /** Person/company entity IDs linked to this project */
  linkedPersonIds?: string[];
  /** Tag strings linked to this project — same canonical form as log.topics */
  linkedTags?: string[];
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
  status: InboxStatus;
  convertedLogId?: string;
  createdAt: string;
  /** Soft delete — never hard-remove user data (Rule 0). */
  deletedAt?: string;
}

export interface ArgusData {
  entities: Entity[];
  logs: Log[];
  inboxItems: InboxItem[];
  attachments: Attachment[];
  version: 3;
}

export type EntityInput = Omit<Entity, "id" | "createdAt" | "updatedAt">;
export type LogInput = Omit<Log, "id" | "createdAt" | "updatedAt">;
export type InboxItemInput = Omit<InboxItem, "id" | "receivedAt" | "status" | "createdAt" | "convertedLogId">;

export interface EntityNetworkView {
  entity: Entity;
  lastInteraction?: string;
  nextTouch?: string;
  topics: string[];
  logCount: number;
  openFollowUps: number;
  /** Co-occurring entities from shared journal entries (relationship graph) */
  relatedEntityIds: string[];
}

/** Time-varying context slice derived from journal co-mentions */
export interface EntityContextSlice {
  periodStart: string;
  periodEnd?: string;
  coEntityIds: string[];
  logIds: string[];
}
