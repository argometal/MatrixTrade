import type { Entity } from "./types";
import { referenceKindFromNotes } from "./reference-types";
import { JournalBehaviorError } from "./journal-behavior";

export function isEventEntity(entity: Entity): boolean {
  return entity.type === "other" && referenceKindFromNotes(entity.notes ?? "") === "event";
}

export function isTopicEntity(entity: Entity): boolean {
  return entity.type === "other" && referenceKindFromNotes(entity.notes ?? "") === "topic";
}

/** Event-linked notes use the event date when available. */
export function eventDateFromLinkedEntities(entities: Entity[], entityIds: string[]): string | undefined {
  for (const id of entityIds) {
    const entity = entities.find((entry) => entry.id === id);
    if (!entity || !isEventEntity(entity)) continue;
    const date = entity.startDate?.slice(0, 10) || entity.endDate?.slice(0, 10);
    if (date) return date;
  }
  return undefined;
}

/** Event note → log sequence must be anchored to a topic. */
export function assertEventNoteCanBecomeTopicLog(entities: Entity[], entityIds: string[]): void {
  const linked = entityIds
    .map((id) => entities.find((entry) => entry.id === id))
    .filter((entry): entry is Entity => Boolean(entry));
  const hasEvent = linked.some(isEventEntity);
  if (!hasEvent) return;
  if (!linked.some(isTopicEntity)) {
    throw new JournalBehaviorError(
      "Link a topic before converting this event note to a log sequence."
    );
  }
}
