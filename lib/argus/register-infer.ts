import { isEventEntity, isTopicEntity } from "./journal-event-origin";
import type { Entity } from "./types";

/** Internal kind override sent to createLogAction (`log` | `event`). */
export function inferRegisterKindOverride(
  entities: Entity[],
  entityIds: string[],
  opts?: { eventDate?: string; followUpDate?: string }
): "log" | "event" {
  if (opts?.followUpDate?.trim()) return "event";

  const linked = entityIds
    .map((id) => entities.find((entry) => entry.id === id))
    .filter((entry): entry is Entity => Boolean(entry));

  if (linked.some(isEventEntity)) return "event";
  if (linked.some(isTopicEntity)) return "log";
  if (opts?.eventDate?.trim()) return "event";
  return "event";
}

export function registerContextHint(entities: Entity[], entityIds: string[]): string {
  const linked = entityIds
    .map((id) => entities.find((entry) => entry.id === id))
    .filter((entry): entry is Entity => Boolean(entry));

  const topics = linked.filter(isTopicEntity);
  const events = linked.filter(isEventEntity);

  if (topics.length > 0 && events.length === 0) {
    const names = topics.map((t) => t.name).join(", ");
    return `Adds to topic timeline${names ? `: ${names}` : ""}.`;
  }
  if (events.length > 0) {
    return "Dated evidence on linked event(s).";
  }
  if (linked.length > 0) {
    return "Evidence linked to selected context.";
  }
  return "Link to a topic, event, or project — or save and link later.";
}

/** Whether the Register sheet should show a user-editable date control. */
export function registerShowsDateField(entities: Entity[], entityIds: string[]): boolean {
  const linked = entityIds
    .map((id) => entities.find((entry) => entry.id === id))
    .filter((entry): entry is Entity => Boolean(entry));

  // Event anchor owns the date — topic timeline has no standalone date.
  if (linked.some(isEventEntity)) return false;
  if (linked.some(isTopicEntity)) return false;
  return true;
}
