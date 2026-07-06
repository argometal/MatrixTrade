import type { Entity } from "./types";
import {
  entityTypeToReferenceKind,
  referenceKindFromNotes,
  type ReferenceKind,
} from "./reference-types";
import type { EntityPickerBuckets } from "./journal-helpers";

/** Where the link picker is opened from — drives allowed targets and time rules. */
export type LinkSourceKind =
  | "inbox"
  | "log"
  | "project"
  | "topic"
  | "event"
  | "organization"
  | "person"
  | "create";

export type LinkContext = {
  projectStart?: string;
  projectEnd?: string;
};

export const REFERENCE_KINDS_ALL: ReferenceKind[] = [
  "person",
  "organization",
  "project",
  "topic",
  "event",
];

export const ALLOWED_LINK_TARGETS: Record<LinkSourceKind, ReferenceKind[]> = {
  inbox: REFERENCE_KINDS_ALL,
  log: REFERENCE_KINDS_ALL,
  project: REFERENCE_KINDS_ALL,
  topic: REFERENCE_KINDS_ALL,
  event: REFERENCE_KINDS_ALL,
  organization: REFERENCE_KINDS_ALL,
  person: REFERENCE_KINDS_ALL,
  /** All create / link flows — any reference type. */
  create: REFERENCE_KINDS_ALL,
};

export function linkSourceKindFromEntity(entity: Entity): LinkSourceKind {
  if (entity.type === "project") return "project";
  if (entity.type === "person") return "person";
  if (entity.type === "company") return "organization";
  const fromNotes = referenceKindFromNotes(entity.notes ?? "");
  if (fromNotes === "topic") return "topic";
  if (fromNotes === "event") return "event";
  return "person";
}

export function entityReferenceKind(entity: Entity): ReferenceKind | null {
  const kind = entityTypeToReferenceKind(entity.type, entity.notes ?? "");
  if (
    kind === "person" ||
    kind === "organization" ||
    kind === "project" ||
    kind === "topic" ||
    kind === "event"
  ) {
    return kind;
  }
  if (entity.type === "person") return "person";
  if (entity.type === "company") return "organization";
  if (entity.type === "project") return "project";
  return null;
}

/** Event entities store their date in startDate (optional endDate for ranges). */
export function entityEventDate(entity: Entity): string | undefined {
  if (referenceKindFromNotes(entity.notes ?? "") !== "event") return undefined;
  return entity.startDate?.trim().slice(0, 10) || undefined;
}

export function isDateWithinRange(
  date: string | undefined,
  rangeStart?: string,
  rangeEnd?: string
): boolean {
  if (!date) return false;
  const d = date.slice(0, 10);
  if (rangeStart && d < rangeStart.slice(0, 10)) return false;
  if (rangeEnd && d > rangeEnd.slice(0, 10)) return false;
  return true;
}

export function isEntityLinkableTarget(
  target: Entity,
  source: LinkSourceKind,
  context: LinkContext = {}
): boolean {
  const targetKind = entityReferenceKind(target);
  if (!targetKind) return false;
  if (!ALLOWED_LINK_TARGETS[source].includes(targetKind)) return false;

  return true;
}

export function filterEntitiesForLinkSource(
  entities: Entity[],
  source: LinkSourceKind,
  context: LinkContext = {}
): Entity[] {
  return entities.filter((entity) => isEntityLinkableTarget(entity, source, context));
}

export function filterEntityPickerBuckets(
  buckets: EntityPickerBuckets,
  source: LinkSourceKind,
  context: LinkContext = {}
): EntityPickerBuckets {
  return {
    recent: filterEntitiesForLinkSource(buckets.recent, source, context),
    frequent: filterEntitiesForLinkSource(buckets.frequent, source, context),
    alphabetical: filterEntitiesForLinkSource(buckets.alphabetical, source, context),
  };
}

export function filterLinkIdsForSource(
  entities: Entity[],
  source: LinkSourceKind,
  ids: string[] | undefined,
  context: LinkContext = {}
): string[] {
  if (!ids?.length) return [];
  const entityMap = new Map(entities.map((entity) => [entity.id, entity]));
  const valid = new Set<string>();
  for (const id of ids) {
    const entity = entityMap.get(id);
    if (entity && isEntityLinkableTarget(entity, source, context)) {
      valid.add(id);
    }
  }
  return [...valid];
}

export function allowedCreateKinds(source: LinkSourceKind): ReferenceKind[] {
  return ALLOWED_LINK_TARGETS[source];
}

export function defaultCreateKind(source: LinkSourceKind): ReferenceKind {
  return ALLOWED_LINK_TARGETS[source][0] ?? "person";
}
