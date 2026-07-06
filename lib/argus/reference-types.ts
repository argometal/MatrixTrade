import type { EntityType } from "./types";

/** Canonical first-class entities — only these may be created in UI/API. */
export type ReferenceKind = "person" | "organization" | "project" | "topic" | "event";

export const REFERENCE_KINDS: ReferenceKind[] = [
  "person",
  "organization",
  "project",
  "topic",
  "event",
];

export const REFERENCE_KIND_LABELS: Record<ReferenceKind, string> = {
  person: "Person",
  organization: "Organization",
  project: "Project",
  topic: "Topic",
  event: "Event",
};

/** Legacy kinds in stored notes — display only, not creatable. */
type LegacyReferenceKind = "place" | "document" | "other";
export type DisplayReferenceKind = ReferenceKind | LegacyReferenceKind;

const DISPLAY_KIND_LABELS: Record<DisplayReferenceKind, string> = {
  ...REFERENCE_KIND_LABELS,
  place: "Place",
  document: "Document",
  other: "Other",
};

const KIND_PREFIX =
  /^Kind:\s*(Person|Organization|Project|Topic|Event|Place|Document|Other)\s*(?:\n|$)/i;

function parseKindToken(token: string): DisplayReferenceKind | null {
  const key = token.toLowerCase();
  if (key === "person") return "person";
  if (key === "organization") return "organization";
  if (key === "project") return "project";
  if (key === "topic") return "topic";
  if (key === "event") return "event";
  if (key === "place") return "place";
  if (key === "document") return "document";
  if (key === "other") return "other";
  return null;
}

export function referenceKindFromNotes(notes: string): DisplayReferenceKind | null {
  const match = notes.match(KIND_PREFIX);
  if (!match) return null;
  return parseKindToken(match[1]);
}

export function referenceKindToEntityType(kind: ReferenceKind): EntityType {
  if (kind === "person") return "person";
  if (kind === "organization") return "company";
  if (kind === "project") return "project";
  return "other";
}

export function entityTypeToReferenceKind(type: EntityType, notes = ""): DisplayReferenceKind {
  const fromNotes = referenceKindFromNotes(notes);
  if (fromNotes) return fromNotes;
  if (type === "person") return "person";
  if (type === "company") return "organization";
  if (type === "project") return "project";
  return "other";
}

export function entityKindLabel(entity: { type: EntityType; notes?: string }): string {
  return DISPLAY_KIND_LABELS[entityTypeToReferenceKind(entity.type, entity.notes ?? "")];
}

export function referenceDisplayLabel(entity: { type: EntityType; name: string; notes?: string }): string {
  return `${entityKindLabel(entity)} · ${entity.name}`;
}

/** Topic/Event persist as EntityType other with Kind prefix in notes (no schema change). */
export function buildReferenceNotes(kind: ReferenceKind, notes: string): string {
  const trimmed = notes.trim();
  if (kind === "topic" || kind === "event") {
    const label = REFERENCE_KIND_LABELS[kind];
    return trimmed ? `Kind: ${label}\n${trimmed}` : `Kind: ${label}`;
  }
  return trimmed;
}

export function buildDocumentNotes(notes: string): string {
  const trimmed = notes.trim();
  return trimmed ? `Kind: Document\n${trimmed}` : "Kind: Document";
}

export function isDocumentEntity(entity: { type: EntityType; notes?: string }): boolean {
  return referenceKindFromNotes(entity.notes ?? "") === "document";
}

export function referenceKindToCreateInput(
  kind: ReferenceKind,
  name: string,
  notes: string
): { entityType: EntityType; notes: string } {
  return {
    entityType: referenceKindToEntityType(kind),
    notes: buildReferenceNotes(kind, notes),
  };
}

export function isCreatableReferenceKind(value: string): value is ReferenceKind {
  return REFERENCE_KINDS.includes(value as ReferenceKind);
}

export function createInputToReferenceKind(entityType: EntityType, notes: string): ReferenceKind {
  const fromNotes = referenceKindFromNotes(notes);
  if (fromNotes && isCreatableReferenceKind(fromNotes)) return fromNotes;
  if (entityType === "person") return "person";
  if (entityType === "company") return "organization";
  if (entityType === "project") return "project";
  return "topic";
}

export function entityDetailHref(entity: { id: string; type: EntityType }): string {
  if (entity.type === "project") return `/argus/projects/${entity.id}`;
  return `/argus/network/${entity.id}`;
}

export function entityNotesForDisplay(notes: string): string {
  return notes.replace(KIND_PREFIX, "").trim();
}
