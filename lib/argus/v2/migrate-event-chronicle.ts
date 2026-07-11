import { getEntity, createLog, updateEntity, readArgus } from "../server-storage";
import { referenceKindFromNotes } from "../reference-types";
import { autoTitleFromBody } from "../journal-helpers";
import {
  buildEventShellNotes,
  eventAnchorDate,
  legacyEventRecordBody,
  normalizeEventTags,
} from "./event-chronicle";

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
  const tags = normalizeEventTags(entity.linkedTags ?? []);
  await createLog({
    kind: "log",
    date: eventDate,
    title: autoTitleFromBody(legacyBody),
    body: legacyBody,
    entityIds: [eventId],
    topics: tags,
    source: "manual",
    private: false,
    attachmentIds: [],
    classificationStatus: "classified",
  });
  await updateEntity(eventId, { notes: buildEventShellNotes() });
  return true;
}

/** Re-read Argus data after migration within the same request. */
export async function readArgusAfterEventMigration(eventId: string | undefined) {
  if (eventId) {
    try {
      await migrateLegacyEventRecordIfNeeded(eventId);
    } catch {
      // Non-fatal — page still renders; user can save manually
    }
  }
  return readArgus();
}
