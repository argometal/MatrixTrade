import { getEntity, createLog, updateEntity, readArgus, updateLog } from "../server-storage";
import { referenceKindFromNotes } from "../reference-types";
import { autoTitleFromBody } from "../journal-helpers";
import {
  buildEventShellNotes,
  eventAnchorDate,
  eventChronicleMigrated,
  legacyEventRecordBody,
  normalizeEventTags,
} from "./event-chronicle";

function sameTagSet(a: string[], b: string[]): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  const left = a.map((t) => t.trim().toLowerCase()).filter(Boolean).sort();
  const right = b.map((t) => t.trim().toLowerCase()).filter(Boolean).sort();
  return left.every((tag, i) => tag === right[i]);
}

function isTrivialLegacyBody(body: string): boolean {
  const t = body.trim();
  if (!t) return true;
  if (/^(---)+$/.test(t)) return true;
  if (/^Kind:\s*Event\s*$/i.test(t)) return true;
  if (/^Kind:\s*Event\s*\n---\s*$/i.test(t)) return true;
  if (/^Chronicle:\s*v2\s*$/i.test(t)) return true;
  return false;
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
 * Idempotent — `Chronicle: v2` marker + prior logs (including soft-deleted) prevent resurrection.
 */
export async function migrateLegacyEventRecordIfNeeded(eventId: string): Promise<boolean> {
  const entity = await getEntity(eventId);
  if (!entity || referenceKindFromNotes(entity.notes ?? "") !== "event") {
    return false;
  }

  const shell = buildEventShellNotes();
  const notes = entity.notes ?? "";

  // Already migrated — never recreate notes from leftover narrative.
  if (eventChronicleMigrated(notes)) {
    if (notes.trim() !== shell) {
      await updateEntity(eventId, { notes: shell });
    }
    return false;
  }

  const legacyBody = legacyEventRecordBody(notes);

  if (!legacyBody || isTrivialLegacyBody(legacyBody)) {
    if (notes.trim() !== shell) {
      await updateEntity(eventId, { notes: shell });
    }
    return false;
  }

  const data = await readArgus();
  // Include soft-deleted — deleting the migrated note must not resurrect it on reopen.
  const alreadyMigrated = data.logs.some(
    (log) => log.entityIds.includes(eventId) && (log.body ?? "").trim() === legacyBody
  );

  // Stamp migrated shell FIRST so concurrent opens stop seeing legacy narrative.
  await updateEntity(eventId, { notes: shell });

  if (alreadyMigrated) {
    return false;
  }

  const eventDate = eventAnchorDate(entity);
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
