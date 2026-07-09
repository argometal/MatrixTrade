import type { ReferenceKind } from "./reference-types";

/** Items the unified + Create flow can create (email stays separate). */
export type CreateItemKind =
  | "journal"
  | ReferenceKind
  | "document"
  | "tag"
  | "runbook";

export type CreateFlowMode = "create" | "link" | "inbox-evidence";

export type LinkFilterKind = ReferenceKind | "document" | "journal" | "all";

export type CreateMenuSection = "knowledge" | "entity" | "execution";

export type JournalLinkRow = {
  id: string;
  title: string;
  date: string;
  preview: string;
  kind: string;
};

export type CreateFlowOpenOptions = {
  mode?: CreateFlowMode;
  itemKind?: CreateItemKind;
  entityId?: string;
  linkedEntityIds?: string[];
  linkedLogIds?: string[];
  entryType?: "log" | "note";
  /** When true, hide the left create-type rail (contextual + Topic, etc.). */
  lockItemKind?: boolean;
  /** When true, open the create flow without a pre-selected item kind (type picker stays open). */
  pickItemKind?: boolean;
  /** Inbox email evidence — link without requiring journal first. */
  inboxId?: string;
  prefillTitle?: string;
  prefillBody?: string;
  prefillTags?: string[];
  prefillDate?: string;
  returnTo?: string;
  /** Link email to entities only — no new journal/entity row. */
  linkOnly?: boolean;
  /** Entity capture only — Register uses CaptureSheet; hides journal from capture menu. */
  entityCaptureOnly?: boolean;
};

export type UnifiedCreatePayload = {
  mode: CreateFlowMode;
  itemKind: CreateItemKind;
  name: string;
  title: string;
  body: string;
  notes: string;
  eventDate: string;
  tags: string[];
  entryType: "log" | "note";
  linkedEntityIds: string[];
  linkedLogIds: string[];
  entityId?: string;
  inboxId?: string;
  linkOnly?: boolean;
  returnTo?: string;
};

export type UnifiedCreateResult = {
  id: string;
  href: string;
  name: string;
};

/** Grouped create menu — Knowledge / Entity / Execution intents. */
export const CREATE_MENU_SECTIONS: { id: CreateMenuSection; label: string; kinds: CreateItemKind[] }[] = [
  { id: "knowledge", label: "Knowledge", kinds: ["journal", "document"] },
  { id: "entity", label: "Entity", kinds: ["person", "organization", "project", "topic", "event", "tag"] },
  { id: "execution", label: "Execution", kinds: ["runbook"] },
];

export const CREATE_ITEM_KINDS: CreateItemKind[] = CREATE_MENU_SECTIONS.flatMap((section) => section.kinds);

export const CREATE_ITEM_LABELS: Record<CreateItemKind, string> = {
  journal: "Journal Entry",
  person: "Person",
  organization: "Organization",
  project: "Project",
  event: "Event",
  topic: "Topic",
  tag: "Tag",
  document: "Document",
  runbook: "Runbook",
};

export const CREATE_ITEM_HINTS: Record<CreateItemKind, string> = {
  journal: "Record what happened — evidence for memory",
  person: "Individual history",
  organization: "Long-term relationship",
  project: "Bounded work",
  event: "Dated occurrence — the meeting, not the notes",
  topic: "Permanent subject — ongoing knowledge",
  tag: "Short label for grouping and search",
  document: "Reference file or note",
  runbook: "Procedure to follow — steps and progress",
};

export const LINK_FILTER_LABELS: Record<LinkFilterKind, string> = {
  all: "All",
  person: "People",
  organization: "Orgs",
  project: "Projects",
  event: "Events",
  topic: "Topics",
  document: "Docs",
  journal: "Journal",
};
