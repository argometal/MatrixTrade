import type { EntityType } from "./types";

/** UI reference kinds — maps to EntityType without schema migration */
export type ReferenceKind =
  | "person"
  | "organization"
  | "project"
  | "place"
  | "document"
  | "topic"
  | "other";

export const REFERENCE_KINDS: ReferenceKind[] = [
  "person",
  "organization",
  "project",
  "place",
  "document",
  "topic",
  "other",
];

export const REFERENCE_KIND_LABELS: Record<ReferenceKind, string> = {
  person: "Person",
  organization: "Organization",
  project: "Project",
  place: "Place",
  document: "Document",
  topic: "Topic",
  other: "Other",
};

export function referenceKindToEntityType(kind: ReferenceKind): EntityType {
  if (kind === "person") return "person";
  if (kind === "organization") return "company";
  if (kind === "project") return "project";
  return "other";
}

export function entityTypeToReferenceKind(type: EntityType): ReferenceKind {
  if (type === "person") return "person";
  if (type === "company") return "organization";
  if (type === "project") return "project";
  return "other";
}

/** Store place/document/topic distinction in notes when persisted as `other` */
export function buildReferenceNotes(kind: ReferenceKind, notes: string): string {
  const trimmed = notes.trim();
  if (kind === "place" || kind === "document" || kind === "topic") {
    const label = REFERENCE_KIND_LABELS[kind];
    return trimmed ? `Kind: ${label}\n${trimmed}` : `Kind: ${label}`;
  }
  return trimmed;
}
