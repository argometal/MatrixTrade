import { parseEventRecord } from "./event-record";
import type { Entity } from "../types";
import { referenceKindFromNotes } from "../reference-types";

/** Event entity shell — narrative lives in linked logs. `Chronicle: v2` = migration done. */
export function buildEventShellNotes(): string {
  return "Kind: Event\nChronicle: v2\n---";
}

/** True once legacy notes → chronicle migration has completed for this event. */
export function eventChronicleMigrated(notes: string): boolean {
  return /^Chronicle:\s*v2\b/im.test(notes);
}

export function isEventEntityNotes(notes: string): boolean {
  return referenceKindFromNotes(notes) === "event";
}

export function eventAnchorDate(entity: Entity): string {
  return (
    entity.startDate?.slice(0, 10) ||
    entity.endDate?.slice(0, 10) ||
    entity.createdAt.slice(0, 10)
  );
}

/** Legacy narrative still stored in entity.notes (pre–Chronicle v2). */
export function legacyEventRecordBody(notes: string): string {
  return parseEventRecord(notes).record.trim();
}

export function normalizeEventTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}
