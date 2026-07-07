import type { ReferenceKind } from "./reference-types";

/** Items the unified + Create flow can create (email stays separate). */
export type CreateItemKind =
  | "journal"
  | ReferenceKind
  | "document"
  | "tag";

export type CreateFlowMode = "create" | "link";

export type LinkFilterKind = ReferenceKind | "document" | "journal" | "all";

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
};

export type UnifiedCreateResult = {
  id: string;
  href: string;
  name: string;
};

export const CREATE_ITEM_KINDS: CreateItemKind[] = [
  "journal",
  "person",
  "organization",
  "project",
  "event",
  "topic",
  "tag",
  "document",
];

export const CREATE_ITEM_LABELS: Record<CreateItemKind, string> = {
  journal: "Journal Entry",
  person: "Person",
  organization: "Organization",
  project: "Project",
  event: "Event",
  topic: "Topic",
  tag: "Tag",
  document: "Document",
};

export const CREATE_ITEM_HINTS: Record<CreateItemKind, string> = {
  journal: "Record anything that matters",
  person: "Individual history",
  organization: "Long-term relationship",
  project: "Bounded work",
  event: "Dated occurrence",
  topic: "Ongoing knowledge",
  tag: "Short label for grouping and search",
  document: "Reference file or note",
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
