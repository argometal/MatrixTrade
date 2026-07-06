import type { ArgusData, Entity, Log } from "./types";
import { entityKindLabel, entityNotesForDisplay, referenceKindFromNotes } from "./reference-types";
import type { JournalLinkRow, LinkFilterKind } from "./create-flow-types";

export function buildJournalLinkRows(data: ArgusData, includePrivate: boolean, limit = 40): JournalLinkRow[] {
  const logs = data.logs
    .filter((log) => !log.deletedAt && (includePrivate || !log.private))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  return logs.map((log) => ({
    id: log.id,
    title: log.title || "Journal entry",
    date: log.date.slice(0, 10),
    preview: log.body.slice(0, 120).replace(/\s+/g, " "),
    kind: log.kind === "log" ? "Log" : log.kind === "follow_up" ? "Follow-up" : "Note",
  }));
}

export function entityLinkFilterKind(entity: Entity): LinkFilterKind | null {
  const fromNotes = referenceKindFromNotes(entity.notes ?? "");
  if (fromNotes === "document") return "document";
  if (fromNotes === "topic") return "topic";
  if (fromNotes === "event") return "event";
  if (entity.type === "person") return "person";
  if (entity.type === "company") return "organization";
  if (entity.type === "project") return "project";
  return null;
}

export function filterEntitiesForLinkTab(entities: Entity[], tab: LinkFilterKind): Entity[] {
  if (tab === "all" || tab === "journal") return entities;
  return entities.filter((entity) => entityLinkFilterKind(entity) === tab);
}

export function mergeEntityIdsFromLogs(data: ArgusData, logIds: string[], base: string[]): string[] {
  const merged = new Set(base);
  for (const logId of logIds) {
    const log = data.logs.find((entry) => entry.id === logId && !entry.deletedAt);
    if (!log) continue;
    for (const id of log.entityIds) merged.add(id);
  }
  return [...merged];
}

export function entityLinkCardMeta(entity: Entity, allEntities: Entity[]): { subtitle: string; meta: string } {
  const kind = entityLinkFilterKind(entity);
  const notes = entityNotesForDisplay(entity.notes ?? "");

  if (kind === "person") {
    const orgLink = (entity.linkedEntityIds ?? [])
      .map((id) => allEntities.find((entry) => entry.id === id && entry.type === "company"))
      .find(Boolean);
    return {
      subtitle: notes || "Individual history",
      meta: orgLink ? orgLink.name : entityKindLabel(entity),
    };
  }
  if (kind === "organization") {
    return { subtitle: notes || "Long-term relationship", meta: "Organization" };
  }
  if (kind === "project") {
    return { subtitle: notes.slice(0, 80) || "Bounded work", meta: "Project" };
  }
  if (kind === "event") {
    const date = entity.startDate?.slice(0, 10);
    return { subtitle: notes || "Dated occurrence", meta: date ? `Event · ${date}` : "Event" };
  }
  if (kind === "topic") {
    return { subtitle: notes || "Ongoing knowledge", meta: "Topic" };
  }
  if (kind === "document") {
    return { subtitle: notes || "Reference file or note", meta: "Document" };
  }
  return { subtitle: notes || entityKindLabel(entity), meta: entityKindLabel(entity) };
}
