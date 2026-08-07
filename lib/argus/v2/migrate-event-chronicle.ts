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

function isTrivialLegacyBody(body: string): boolean {
  const t = body.trim();
  if (!t) return true;
  // Separators / kind echoes that must never become chronicle notes
  if (/^(---)+$/.test(t)) return true;
  if (/^Kind:\s*Event\s*$/i.test(t)) return true;
  if (/^Kind:\s*Event\s*\n---\s*$/i.test(t)) return true;
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
 * Idempotent — safe on every event open / RSC render (no duplicate notes).
 */
export async function migrateLegacyEventRecordIfNeeded(eventId: string): Promise<boolean> {
  const entity = await getEntity(eventId);
  if (!entity || referenceKindFromNotes(entity.notes ?? "") !== "event") {
    return false;
  }

  const shell = buildEventShellNotes();
  const legacyBody = legacyEventRecordBody(entity.notes ?? "");

  if (!legacyBody || isTrivialLegacyBody(legacyBody)) {
    if (entity.notes?.trim() !== shell) {
      await updateEntity(eventId, { notes: shell });
    }
    return false;
  }

  const data = await readArgus();
  const alreadyMigrated = data.logs.some(
    (log) =>
      !log.deletedAt &&
      log.entityIds.includes(eventId) &&
      (log.body ?? "").trim() === legacyBody
  );

  // Clear shell FIRST so concurrent page loads do not keep seeing legacy narrative.
  if (entity.notes?.trim() !== shell) {
    await updateEntity(eventId, { notes: shell });
  }

  if (alreadyMigrated) {
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
