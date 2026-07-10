import type { ArgusData, InboxItem, Log } from "../../types";
import { referenceKindFromNotes } from "../../reference-types";
import type { CollectedVaultEvidence } from "../types";

export type DossierNarrativeSection = {
  id: string;
  title: string;
  subtitle?: string;
  logs: Log[];
  inbox: InboxItem[];
};

function isEventEntity(data: ArgusData, entityId: string): boolean {
  const entity = data.entities.find((e) => e.id === entityId && !e.deletedAt);
  if (!entity || entity.type !== "other") return false;
  return referenceKindFromNotes(entity.notes ?? "") === "event";
}

function eventSubtitle(data: ArgusData, entityId: string): string | undefined {
  const entity = data.entities.find((e) => e.id === entityId && !e.deletedAt);
  if (!entity) return undefined;
  const notes = entity.notes ?? "";
  const dateMatch = notes.match(/eventDate:(\d{4}-\d{2}-\d{2})/);
  return dateMatch ? dateMatch[1] : undefined;
}

function evidenceForEntity(logs: Log[], inbox: InboxItem[], entityId: string) {
  return {
    logs: logs.filter((log) => log.entityIds.includes(entityId)),
    inbox: inbox.filter((item) => (item.linkedEntityIds ?? []).includes(entityId)),
  };
}

/** D4 — group scoped evidence under linked Event anchors; remainder goes to general chronology. */
export function buildDossierNarrativeSections(
  data: ArgusData,
  collected: CollectedVaultEvidence
): { eventSections: DossierNarrativeSection[]; general: DossierNarrativeSection } {
  const { logs, inbox, relatedEntityIds, scope } = collected;
  const eventIds = relatedEntityIds.filter((id) => isEventEntity(data, id));

  const assignedLogIds = new Set<string>();
  const assignedInboxIds = new Set<string>();

  const eventSections: DossierNarrativeSection[] = eventIds.map((eventId) => {
    const entity = data.entities.find((e) => e.id === eventId && !e.deletedAt);
    const scoped = evidenceForEntity(logs, inbox, eventId);
    for (const log of scoped.logs) assignedLogIds.add(log.id);
    for (const item of scoped.inbox) assignedInboxIds.add(item.id);
    return {
      id: eventId,
      title: entity?.name ?? "Event",
      subtitle: eventSubtitle(data, eventId),
      logs: scoped.logs,
      inbox: scoped.inbox,
    };
  });

  eventSections.sort((a, b) => (a.subtitle ?? "").localeCompare(b.subtitle ?? ""));

  const generalLogs = logs.filter((log) => !assignedLogIds.has(log.id));
  const generalInbox = inbox.filter((item) => !assignedInboxIds.has(item.id));

  return {
    eventSections: eventSections.filter((s) => s.logs.length > 0 || s.inbox.length > 0),
    general: {
      id: scope.id,
      title: "General chronology",
      logs: generalLogs,
      inbox: generalInbox,
    },
  };
}
