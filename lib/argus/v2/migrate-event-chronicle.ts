import { getEntity, createLog, updateEntity, readArgus, updateLog } from "../server-storage";
import { referenceKindFromNotes } from "../reference-types";
import { autoTitleFromBody } from "../journal-helpers";
import {
  buildEventShellNotes,
  eventAnchorDate,
  legacyEventRecordBody,
  normalizeEventTags,
} from "./event-chronicle";

function sameTagSet(a: string[], b: string[]): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  const left = a.map((t) => t.trim().toLowerCase()).filter(Boolean).sort();
  const right = b.map((t) => t.trim().toLowerCase()).filter(Boolean).sort();
  return left.every((tag, i) => tag === right[i]);
}

/**
 * Clear note Tags that were auto-stamped as the full Event Signals set.
 * One note × N signals was inflating Patterns / stats. Safe heuristic: topics === signals.
 */
export async function repairEventChronicleSignalStampInflation(eventId: string): Promise<number> {
  const entity = await getEntity(eventId);
  if (!entity || referenceKindFromNotes(entity.notes ?? "") !== "event") return 0;

  const signals = normalizeEventTags(entity.linkedTags ?? []);
  if (signals.length === 0) return 0;

  const data = await readArgus();
  let repaired = 0;
  for (const log of data.logs) {
    if (log.deletedAt) continue;
    if (!log.entityIds.includes(eventId)) continue;
    if (!sameTagSet(log.topics ?? [], signals)) continue;
    await updateLog(log.id, {
      title: log.title,
      body: log.body,
      kind: log.kind,
      date: log.date,
      followUpDate: log.followUpDate,
      entityIds: log.entityIds,
      topics: [],
      private: log.private,
    });
    repaired += 1;
  }
  return repaired;
}

/**
 * One-time migration: legacy narrative in entity.notes → first chronicle log.
 * Safe to call during RSC render (no revalidatePath).
 */
export async function migrateLegacyEventRecordIfNeeded(eventId: string): Promise<boolean> {
  const entity = await getEntity(eventId);
  if (!entity || referenceKindFromNotes(entity.notes ?? "") !== "event") {
    return false;
  }

  const legacyBody = legacyEventRecordBody(entity.notes ?? "");
  if (!legacyBody) {
    if (entity.notes?.trim() !== buildEventShellNotes()) {
      await updateEntity(eventId, { notes: buildEventShellNotes() });
    }
    return false;
  }

  const eventDate = eventAnchorDate(entity);
  // Legacy body becomes one Note — do not stamp all Event Signals onto it (Patterns inflate).
  await createLog({
    kind: "log",
    date: eventDate,
    title: autoTitleFromBody(legacyBody),
    body: legacyBody,
    entityIds: [eventId],
    topics: [],
    source: "manual",
    private: false,
    attachmentIds: [],
    classificationStatus: "classified",
  });
  await updateEntity(eventId, { notes: buildEventShellNotes() });
  return true;
}

/** Re-read Argus data after migration + signal-stamp repair within the same request. */
export async function readArgusAfterEventMigration(eventId: string | undefined) {
  if (eventId) {
    try {
      await migrateLegacyEventRecordIfNeeded(eventId);
      await repairEventChronicleSignalStampInflation(eventId);
    } catch {
      // Non-fatal — page still renders; user can save manually
    }
  }
  return readArgus();
}
