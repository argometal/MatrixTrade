"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured, verifyArgusPrivatePin } from "@/lib/auth/passwords";
import { requireArgusSession } from "@/lib/auth/require-session";
import {
  appendLogAttachment,
  archiveInboxItem,
  classifyLog,
  clearAllArgusData,
  convertInboxToLog,
  createEntity,
  createLog,
  createRunbook,
  deleteEntity,
  deleteInboxItem,
  deleteLog,
  getEntity,
  getInboxItems,
  getLog,
  getRunbook,
  getInboxItem,
  linkInboxToEntities,
  saveInboxEvidenceLinks,
  setInboxLinkedEntities,
  updateInboxTriage,
  readArgus,
  saveAttachment,
  setInboxPrivate,
  updateEntity,
  updateLog,
  updateRunbook,
} from "@/lib/argus/server-storage";
import type { EntityType, JournalKind, LogSource, StrategicValue } from "@/lib/argus/types";
import { JOURNAL_KINDS } from "@/lib/argus/labels";
import { inferJournalKind, resolveLogDate, autoTitleFromBody } from "@/lib/argus/journal-helpers";
import { resolveClassificationStatus } from "@/lib/argus/normalize";
import {
  normalizeContactValueKeys,
  normalizeMyValueKeys,
} from "@/lib/argus/network-relationship-metrics";
import {
  buildReferenceNotes,
  entityDetailHref,
  isCreatableReferenceKind,
  referenceKindFromNotes,
  referenceKindToCreateInput,
  createInputToReferenceKind,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import { filterLinkIdsForSource } from "@/lib/argus/link-hierarchy";
import { partitionIdsByEntityKind } from "@/lib/argus/v2/entity-link-counts";
import type { UnifiedCreatePayload, UnifiedCreateResult } from "@/lib/argus/create-flow-types";
import { buildRunbookItemsFromText, runbookStamp } from "@/lib/argus/runbook-helpers";
import { buildDocumentNotes } from "@/lib/argus/reference-types";
import {
  assertJournalKindTransition,
  canConvertNoteToLog,
  canExtractLogToNote,
  JournalBehaviorError,
} from "@/lib/argus/journal-behavior";
import { assertEventNoteCanBecomeTopicLog, eventDateFromLinkedEntities } from "@/lib/argus/journal-event-origin";
import { ArgusWriteBlockedError, isDestructiveAllowed } from "@/lib/argus/data-safety";
import {
  ArgusPersistenceError,
  argusErrorQueryParams,
  formatArgusError,
} from "@/lib/argus/persistence/errors";
import { projectHasPrivateEvidence } from "@/lib/argus/v2/project-private";

function revalidateArgus(): void {
  revalidatePath("/argus");
  revalidatePath("/argus/network");
  revalidatePath("/argus/search");
  revalidatePath("/argus/inbox");
  revalidatePath("/argus/diagnostics");
  revalidatePath("/argus/v2/diagnostics");
  revalidatePath("/argus/v2");
}

export type RefreshInboxResult = {
  ok: boolean;
  count: number;
  checkedAt: string;
  message?: string;
};

export async function refreshArgusInboxFromEmailAction(): Promise<RefreshInboxResult> {
  await requireArgusSession();

  const { getInboxItems } = await import("@/lib/argus/server-storage");
  const { isActiveRecord } = await import("@/lib/argus/supabase-protection/protected-counts");

  try {
    const items = await getInboxItems();
    const count = items.filter(isActiveRecord).length;
    revalidateArgus();

    return {
      ok: true,
      count,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      count: 0,
      checkedAt: new Date().toISOString(),
      message: err instanceof Error ? err.message : "Inbox refresh failed",
    };
  }
}

function parseTopics(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function redirectWriteFailure(fallback: string, err: unknown): never {
  const { errorLayer, errorMsg } = argusErrorQueryParams(err);
  redirect(`${fallback}?errorLayer=${encodeURIComponent(errorLayer)}&errorMsg=${encodeURIComponent(errorMsg)}`);
}

function handleWriteError(err: unknown, fallback: string): never {
  redirectWriteFailure(fallback, err);
}

function parseJournalInput(formData: FormData) {
  const today = new Date().toISOString().slice(0, 10);
  const eventDate = String(formData.get("eventDate") ?? "").slice(0, 10);
  const followUpRaw = String(formData.get("followUpDate") ?? "").slice(0, 10);
  const overrideRaw = String(formData.get("kindOverride") ?? "").trim();
  const kindOverride = JOURNAL_KINDS.includes(overrideRaw as JournalKind)
    ? (overrideRaw as JournalKind)
    : undefined;

  const kind = inferJournalKind({
    followUpDate: followUpRaw || undefined,
    eventDate: eventDate || undefined,
    kindOverride,
  });
  const date = resolveLogDate(kind, eventDate, today);

  return {
    kind,
    date,
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    private: formData.get("private") === "on",
    source: String(formData.get("source") ?? "manual") as LogSource,
    followUpDate: followUpRaw ? followUpRaw : undefined,
    topics: parseTopics(String(formData.get("topics") ?? "")),
  };
}

async function resolveEntityIds(formData: FormData): Promise<string[]> {
  const entityIds = formData.getAll("entityIds").map(String).filter(Boolean);
  const newEntityName = String(formData.get("newEntityName") ?? "").trim();
  if (newEntityName) {
    const rawType = String(formData.get("newEntityType") ?? "person") as EntityType;
    const rawNotes = String(formData.get("newEntityNotes") ?? "").trim();
    const kind = createInputToReferenceKind(rawType, rawNotes);
    const created = await persistNewEntity(kind, newEntityName, rawNotes);
    entityIds.push(created.id);
  }
  return entityIds;
}

export async function createLogAction(formData: FormData): Promise<void> {
  try {
    const entityIds = await resolveEntityIds(formData);
    const input = parseJournalInput(formData);
    if (!input.body) {
      redirect("/argus/v2?capture=1&error=content");
    }

    const title = input.title || autoTitleFromBody(input.body);

    const log = await createLog({
      ...input,
      title,
      entityIds,
      classificationStatus: resolveClassificationStatus(entityIds),
      attachmentIds: [],
    });

    const file = formData.get("attachment");
    if (file instanceof File && file.size > 0) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const att = await saveAttachment(
        file.name,
        file.type || "application/octet-stream",
        bytes,
        "journal",
        log.id
      );
      await appendLogAttachment(log.id, att.id);
    }

    revalidateArgus();
    revalidatePath("/argus/v2/inbox");
    const returnTo = String(formData.get("returnTo") ?? "log");
    redirect(returnTo === "journal" ? "/argus/v2" : `/argus/logs/${log.id}`);
  } catch (err) {
    handleWriteError(err, "/argus/v2");
  }
}

export async function updateLogAction(formData: FormData): Promise<void> {
  const logId = String(formData.get("logId") ?? "");
  const entityIds = await resolveEntityIds(formData);
  const input = parseJournalInput(formData);
  if (!input.body) {
    redirect(`/argus/logs/${logId}?error=content`);
  }

  const existing = await getLog(logId, true);
  if (!existing) {
    redirect(`/argus/logs/${logId}?error=notfound`);
  }

  try {
    assertJournalKindTransition(existing.kind, input.kind);
  } catch (err) {
    handleWriteError(err, `/argus/logs/${logId}`);
  }

  const title = input.title || autoTitleFromBody(input.body);

  await updateLog(logId, {
    title,
    body: input.body,
    kind: input.kind,
    date: input.date,
    followUpDate: input.followUpDate,
    entityIds,
    topics: input.topics,
    private: input.private,
  });

  revalidateArgus();
  revalidatePath(`/argus/logs/${logId}`);
  redirect(`/argus/logs/${logId}`);
}

export async function convertNoteToLogAction(formData: FormData): Promise<void> {
  const logId = String(formData.get("logId") ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const date = String(formData.get("date") ?? "").slice(0, 10) || today;

  try {
    const existing = await getLog(logId, true);
    if (!existing) {
      throw new JournalBehaviorError("Journal entry not found.");
    }
    if (!canConvertNoteToLog(existing)) {
      throw new JournalBehaviorError("Only a standalone note can convert to a log.");
    }

    const data = await readArgus();
    assertEventNoteCanBecomeTopicLog(data.entities, existing.entityIds);

    const convertDate =
      date ||
      eventDateFromLinkedEntities(data.entities, existing.entityIds) ||
      existing.date.slice(0, 10) ||
      today;

    await updateLog(logId, {
      title: existing.title,
      body: existing.body,
      kind: "log",
      date: convertDate,
      followUpDate: undefined,
      entityIds: existing.entityIds,
      topics: existing.topics,
      private: existing.private,
    });

    revalidateArgus();
    revalidatePath(`/argus/logs/${logId}`);
    redirect(`/argus/logs/${logId}`);
  } catch (err) {
    handleWriteError(err, `/argus/logs/${logId}`);
  }
}

export async function extractLogToNoteAction(formData: FormData): Promise<void> {
  const logId = String(formData.get("logId") ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const date = String(formData.get("date") ?? "").slice(0, 10) || today;

  try {
    const existing = await getLog(logId, true);
    if (!existing) {
      throw new JournalBehaviorError("Journal entry not found.");
    }
    if (!canExtractLogToNote(existing)) {
      throw new JournalBehaviorError("Only a log entry can be extracted to a note.");
    }

    const note = await createLog({
      kind: "event",
      date,
      title: existing.title,
      body: existing.body,
      entityIds: [...existing.entityIds],
      topics: [...existing.topics],
      classificationStatus: existing.classificationStatus,
      private: existing.private,
      source: existing.source,
      attachmentIds: [],
    });

    revalidateArgus();
    redirect(`/argus/logs/${note.id}`);
  } catch (err) {
    handleWriteError(err, `/argus/logs/${logId}`);
  }
}

export async function classifyLogAction(formData: FormData): Promise<void> {
  const logId = String(formData.get("logId") ?? "");
  const entityIds = await resolveEntityIds(formData);
  if (entityIds.length === 0) {
    redirect(`/argus/logs/${logId}?error=entity`);
  }
  await classifyLog(logId, entityIds);
  revalidateArgus();
  redirect(`/argus/logs/${logId}`);
}

export async function linkInboxAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  const entityIds = await resolveEntityIds(formData);
  const data = await readArgus();
  const validIds = filterLinkIdsForSource(data.entities, "inbox", entityIds);
  if (validIds.length === 0) {
    redirect(`/argus/inbox/${inboxId}?error=reference`);
  }
  await linkInboxToEntities(inboxId, validIds);
  revalidateArgus();
  revalidatePath(`/argus/inbox/${inboxId}`);
  revalidatePath("/argus/v2/inbox");
  const returnTo = String(formData.get("returnTo") ?? "inbox");
  if (returnTo === "journal") redirect("/argus/v2");
  if (returnTo.startsWith("/argus/")) redirect(returnTo);
  redirect(`/argus/inbox/${inboxId}`);
}

/** Replace inbox links exactly (v2 link UI — supports unlink). No redirect — for modals. */
export async function saveInboxLinksAction(
  inboxId: string,
  entityIds: string[]
): Promise<{ ok: true }> {
  await requireArgusSession();
  if (!inboxId) throw new Error("Missing inbox id");
  const data = await readArgus();
  const validIds = filterLinkIdsForSource(data.entities, "inbox", entityIds);
  await setInboxLinkedEntities(inboxId, validIds);
  revalidateArgus();
  revalidatePath(`/argus/inbox/${inboxId}`);
  revalidatePath("/argus/v2/inbox");
  return { ok: true };
}

/** Replace inbox links exactly (v2 link UI — supports unlink). */
export async function setInboxLinksAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  const entityIds = await resolveEntityIds(formData);
  await saveInboxLinksAction(inboxId, entityIds);
  const returnTo = String(formData.get("returnTo") ?? "inbox");
  if (returnTo === "journal") redirect("/argus/v2");
  if (returnTo.startsWith("/argus/")) redirect(returnTo);
  redirect(`/argus/inbox/${inboxId}`);
}

/** Persist inbox triage: status, follow-up date, user-selected tags. */
export async function setInboxTriageAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? `/argus/v2/inbox?selected=${inboxId}`);
  const patch = parseInboxTriagePatch(formData);
  if (Object.keys(patch).length === 0) {
    redirect(returnTo.startsWith("/argus/") ? returnTo : `/argus/v2/inbox?selected=${inboxId}`);
  }

  await updateInboxTriage(inboxId, patch);
  revalidateArgus();
  revalidatePath(`/argus/inbox/${inboxId}`);
  revalidatePath("/argus/v2/inbox");
  redirect(returnTo.startsWith("/argus/") ? returnTo : `/argus/v2/inbox?selected=${inboxId}`);
}

/** Client-side triage updates without redirect (detail panel fields). */
export async function updateInboxTriageAction(
  inboxId: string,
  patch: {
    status?: "pending" | "linked" | "converted" | "archived";
    followUpDate?: string | null;
    topics?: string[];
  }
): Promise<{ ok: true }> {
  await requireArgusSession();
  if (!inboxId) throw new Error("Missing inbox id");
  if (Object.keys(patch).length === 0) return { ok: true };
  await updateInboxTriage(inboxId, patch);
  revalidateArgus();
  revalidatePath(`/argus/inbox/${inboxId}`);
  revalidatePath("/argus/v2/inbox");
  return { ok: true };
}

function parseInboxTriagePatch(formData: FormData) {
  const statusRaw = String(formData.get("status") ?? "").trim();
  const followUpRaw = String(formData.get("followUpDate") ?? "").trim();
  const topics = formData
    .getAll("topics")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const patch: Parameters<typeof updateInboxTriage>[1] = {};
  if (statusRaw === "pending" || statusRaw === "linked" || statusRaw === "converted" || statusRaw === "archived") {
    patch.status = statusRaw;
  }
  if (formData.has("followUpDate")) {
    patch.followUpDate = followUpRaw ? followUpRaw.slice(0, 10) : null;
  }
  if (formData.has("topics")) {
    patch.topics = topics;
  }
  return patch;
}

export async function convertInboxAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  const entityIds = await resolveEntityIds(formData);
  const input = parseJournalInput(formData);
  if (!input.body) {
    redirect(`/argus/inbox/${inboxId}?error=content`);
  }

  const title = input.title || autoTitleFromBody(input.body);

  const { log } = await convertInboxToLog(inboxId, {
    ...input,
    title,
    entityIds,
  });

  revalidateArgus();
  revalidatePath(`/argus/inbox/${inboxId}`);
  revalidatePath("/argus/v2/inbox");
  const returnTo = String(formData.get("returnTo") ?? "");
  if (returnTo.startsWith("/argus/")) redirect(returnTo);
  redirect(`/argus/logs/${log.id}`);
}

export async function archiveInboxAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  await archiveInboxItem(inboxId);
  revalidateArgus();
  revalidatePath("/argus/v2/inbox");
  const returnTo = String(formData.get("returnTo") ?? "/argus/inbox");
  redirect(returnTo.startsWith("/argus/") ? returnTo : "/argus/inbox");
}

export async function setInboxPrivateAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  const isPrivate = formData.get("private") === "on" || formData.get("private") === "true";
  await setInboxPrivate(inboxId, isPrivate);
  revalidateArgus();
  revalidatePath(`/argus/inbox/${inboxId}`);
  const returnTo = String(formData.get("returnTo") ?? "inbox");
  redirect(returnTo === "journal" ? "/argus/v2" : `/argus/inbox/${inboxId}`);
}

export type CreatedEntityResult = {
  id: string;
  href: string;
  name: string;
};

async function persistNewEntity(
  kind: ReferenceKind,
  name: string,
  notes: string,
  linkedEntityIds: string[] = [],
  options?: { startDate?: string; endDate?: string }
): Promise<CreatedEntityResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new ArgusPersistenceError("validation", "Name is required.");
  }
  if (!isCreatableReferenceKind(kind)) {
    throw new ArgusPersistenceError("validation", "Invalid reference type.");
  }

  const data = await readArgus();
  const validIds = filterLinkIdsForSource(data.entities, "create", linkedEntityIds);
  const partitioned = partitionIdsByEntityKind(data.entities, validIds);
  const { entityType, notes: builtNotes } = referenceKindToCreateInput(kind, trimmedName, notes);
  const startDate = options?.startDate?.trim().slice(0, 10);
  const endDate = options?.endDate?.trim().slice(0, 10);

  const entity = await createEntity({
    type: entityType,
    name: trimmedName,
    notes: builtNotes,
    alias: "",
    strategicValue: 3,
    linkedEntityIds: validIds,
    ...(kind === "project"
      ? {
          linkedPersonIds: partitioned.personIds,
          linkedTopicIds: partitioned.topicIds,
          linkedEventIds: partitioned.eventIds,
        }
      : {}),
    ...(kind === "event"
      ? {
          linkedPersonIds: partitioned.personIds,
          ...(startDate ? { startDate, ...(endDate ? { endDate } : {}) } : {}),
        }
      : {}),
  });

  const confirmed = await getEntity(entity.id);
  if (!confirmed) {
    throw new ArgusPersistenceError(
      "database",
      `Object "${trimmedName}" was not readable after save confirmation.`
    );
  }

  revalidateArgus();
  revalidatePath(`/argus/network/${entity.id}`);
  revalidatePath(`/argus/projects/${entity.id}`);
  revalidatePath(`/argus/v2/organizations/${entity.id}`);
  revalidatePath(`/argus/v2/projects/${entity.id}`);
  revalidatePath("/argus/v2/browse/topics");
  revalidatePath("/argus/v2/browse/events");
  revalidatePath("/argus/v2");

  return { id: entity.id, href: entityDetailHref(entity), name: entity.name };
}

async function persistDocumentEntity(
  name: string,
  notes: string,
  linkedEntityIds: string[] = []
): Promise<CreatedEntityResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new ArgusPersistenceError("validation", "Name is required.");
  }

  const data = await readArgus();
  const validIds = filterLinkIdsForSource(data.entities, "create", linkedEntityIds);

  const entity = await createEntity({
    type: "other",
    name: trimmedName,
    notes: buildDocumentNotes(notes),
    alias: "",
    strategicValue: 3,
    linkedEntityIds: validIds,
  });

  const confirmed = await getEntity(entity.id);
  if (!confirmed) {
    throw new ArgusPersistenceError(
      "database",
      `Object "${trimmedName}" was not readable after save confirmation.`
    );
  }

  revalidateArgus();
  revalidatePath(`/argus/network/${entity.id}`);
  revalidatePath("/argus/v2");

  return { id: entity.id, href: entityDetailHref(entity), name: entity.name };
}

async function persistRunbookFromPayload(
  title: string,
  stepsText: string,
  linkedEntityIds: string[]
): Promise<UnifiedCreateResult> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new ArgusPersistenceError("validation", "Title is required.");
  }
  const items = buildRunbookItemsFromText(stepsText);
  if (items.filter((item) => item.type === "item").length === 0) {
    throw new ArgusPersistenceError("validation", "Add at least one step.");
  }

  const runbook = await createRunbook({
    title: trimmedTitle,
    items,
    linkedEntityIds,
  });

  revalidateArgus();
  revalidatePath(`/argus/v2/runbooks/${runbook.id}`);
  for (const entityId of runbook.linkedEntityIds) {
    revalidatePath(`/argus/v2/projects/${entityId}`);
    revalidatePath(`/argus/v2/organizations/${entityId}`);
  }

  return {
    id: runbook.id,
    href: `/argus/v2/runbooks/${runbook.id}`,
    name: runbook.title,
  };
}

async function linkEntityToLogsAction(entityId: string, logIds: string[]): Promise<void> {
  if (!logIds.length) return;
  const data = await readArgus();
  for (const logId of logIds) {
    const log = data.logs.find((entry) => entry.id === logId && !entry.deletedAt);
    if (!log || log.entityIds.includes(entityId)) continue;
    await updateLog(logId, {
      title: log.title,
      body: log.body,
      kind: log.kind,
      date: log.date,
      followUpDate: log.followUpDate,
      entityIds: [...log.entityIds, entityId],
      topics: log.topics,
      private: log.private,
    });
  }
  revalidateArgus();
}

export async function createMissingLinkTargetAction(
  kind: ReferenceKind | "document",
  name: string,
  notes = "",
  options?: { startDate?: string; endDate?: string }
): Promise<CreatedEntityResult> {
  await requireArgusSession();
  if (kind === "document") {
    return persistDocumentEntity(name, notes);
  }
  return persistNewEntity(kind, name, notes, [], options);
}

export async function saveUnifiedCreateFlowAction(
  payload: UnifiedCreatePayload
): Promise<UnifiedCreateResult> {
  await requireArgusSession();
  const data = await readArgus();
  const linkedEntityIds = filterLinkIdsForSource(data.entities, "create", payload.linkedEntityIds);

  if (payload.mode === "link") {
    if (!payload.entityId) {
      throw new ArgusPersistenceError("validation", "Entity not found.");
    }
    await setEntityLinkedIdsAction(payload.entityId, linkedEntityIds);
    await linkEntityToLogsAction(payload.entityId, payload.linkedLogIds);
    const entity = await getEntity(payload.entityId);
    if (!entity) {
      throw new ArgusPersistenceError("validation", "Entity not found.");
    }
    return { id: entity.id, href: entityDetailHref(entity), name: entity.name };
  }

  if (payload.mode === "inbox-evidence") {
    if (!payload.inboxId) {
      throw new ArgusPersistenceError("validation", "Inbox item not found.");
    }
    const inbox = await getInboxItem(payload.inboxId, true);
    if (!inbox) {
      throw new ArgusPersistenceError("validation", "Inbox item not found.");
    }
    if (inbox.status === "archived") {
      throw new ArgusPersistenceError("validation", "Inbox item is archived.");
    }

    const mergedEntityIds = [
      ...new Set([
        ...(inbox.linkedEntityIds ?? []),
        ...linkedEntityIds,
      ]),
    ];

    if (payload.linkOnly) {
      if (mergedEntityIds.length === 0) {
        throw new ArgusPersistenceError("validation", "Link at least one person, organization, project, event, or topic.");
      }
      await saveInboxEvidenceLinks(payload.inboxId, mergedEntityIds);
      revalidateArgus();
      revalidatePath("/argus/v2/inbox");
      const title = payload.title.trim() || "Email evidence";
      return {
        id: inbox.id,
        href: payload.returnTo ?? `/argus/v2/inbox?selected=${inbox.id}`,
        name: title,
      };
    }

    if (payload.itemKind === "journal") {
      const body = payload.body.trim();
      if (!body) {
        throw new ArgusPersistenceError("validation", "Content is required.");
      }
      const today = new Date().toISOString().slice(0, 10);
      const date = payload.eventDate.trim().slice(0, 10) || today;
      const kind: JournalKind = payload.entryType === "note" ? "event" : "log";
      const title = payload.title.trim() || autoTitleFromBody(body);

      const log = await createLog({
        kind,
        date,
        title,
        body,
        private: inbox.private ?? false,
        source: (inbox.source === "email" ? "email" : "inbox") as LogSource,
        entityIds: mergedEntityIds,
        topics: payload.tags,
        classificationStatus: resolveClassificationStatus(mergedEntityIds),
        attachmentIds: [],
        inboxItemId: inbox.id,
      });

      await saveInboxEvidenceLinks(payload.inboxId, mergedEntityIds);
      revalidateArgus();
      revalidatePath("/argus/v2/inbox");
      return { id: log.id, href: `/argus/logs/${log.id}`, name: title };
    }

    if (payload.itemKind === "runbook") {
      const result = await persistRunbookFromPayload(payload.name, payload.body, mergedEntityIds);
      await saveInboxEvidenceLinks(payload.inboxId, mergedEntityIds);
      revalidatePath("/argus/v2/inbox");
      return result;
    }

    const trimmedName = payload.name.trim();
    if (!trimmedName) {
      throw new ArgusPersistenceError("validation", "Name is required.");
    }

    let result: CreatedEntityResult;
    if (payload.itemKind === "document") {
      result = await persistDocumentEntity(trimmedName, payload.notes, mergedEntityIds);
    } else if (payload.itemKind === "tag") {
      result = await persistNewEntity("topic", trimmedName, payload.notes, mergedEntityIds);
    } else {
      result = await persistNewEntity(
        payload.itemKind,
        trimmedName,
        payload.notes,
        mergedEntityIds,
        payload.itemKind === "event" && payload.eventDate
          ? { startDate: payload.eventDate.trim().slice(0, 10) }
          : undefined
      );
    }

    const withCreated = [...new Set([...mergedEntityIds, result.id])];
    await saveInboxEvidenceLinks(payload.inboxId, withCreated);
    await linkEntityToLogsAction(result.id, payload.linkedLogIds);

    revalidateArgus();
    revalidatePath("/argus/v2/inbox");
    return result;
  }

  if (payload.itemKind === "journal") {
    const body = payload.body.trim();
    if (!body) {
      throw new ArgusPersistenceError("validation", "Content is required.");
    }
    const today = new Date().toISOString().slice(0, 10);
    const date = payload.eventDate.trim().slice(0, 10) || today;
    const kind: JournalKind = payload.entryType === "note" ? "event" : "log";
    const title = payload.title.trim() || autoTitleFromBody(body);

    const log = await createLog({
      kind,
      date,
      title,
      body,
      private: false,
      source: "manual",
      entityIds: linkedEntityIds,
      topics: payload.tags,
      classificationStatus: resolveClassificationStatus(linkedEntityIds),
      attachmentIds: [],
    });

    revalidateArgus();
    revalidatePath("/argus/v2/inbox");
    return { id: log.id, href: `/argus/logs/${log.id}`, name: title };
  }

  if (payload.itemKind === "runbook") {
    return persistRunbookFromPayload(payload.name, payload.body, linkedEntityIds);
  }

  const trimmedName = payload.name.trim();
  if (!trimmedName) {
    throw new ArgusPersistenceError("validation", "Name is required.");
  }

  let result: CreatedEntityResult;
  if (payload.itemKind === "document") {
    result = await persistDocumentEntity(trimmedName, payload.notes, linkedEntityIds);
  } else if (payload.itemKind === "tag") {
    result = await persistNewEntity("topic", trimmedName, payload.notes, linkedEntityIds);
  } else {
    result = await persistNewEntity(
      payload.itemKind,
      trimmedName,
      payload.notes,
      linkedEntityIds,
      payload.itemKind === "event" && payload.eventDate
        ? { startDate: payload.eventDate.trim().slice(0, 10) }
        : undefined
    );
  }

  await linkEntityToLogsAction(result.id, payload.linkedLogIds);
  return result;
}

export async function createEntityInlineAction(
  kind: ReferenceKind,
  name: string,
  notes = "",
  linkedEntityIds: string[] = [],
  options?: { startDate?: string; endDate?: string }
): Promise<CreatedEntityResult> {
  return persistNewEntity(kind, name, notes, linkedEntityIds, options);
}

export async function setEntityLinkedIdsAction(entityId: string, linkedEntityIds: string[]): Promise<void> {
  const entity = await getEntity(entityId);
  if (!entity) {
    throw new ArgusPersistenceError("validation", "Entity not found.");
  }
  const data = await readArgus();
  const validIds = filterLinkIdsForSource(data.entities, "create", linkedEntityIds);
  const partitioned = partitionIdsByEntityKind(data.entities, validIds);
  const patch =
    entity.type === "project"
      ? {
          linkedEntityIds: validIds,
          linkedPersonIds: partitioned.personIds,
          linkedTopicIds: partitioned.topicIds,
          linkedEventIds: partitioned.eventIds,
        }
      : referenceKindFromNotes(entity.notes ?? "") === "event"
        ? {
            linkedEntityIds: validIds,
            linkedPersonIds: partitioned.personIds,
          }
        : { linkedEntityIds: validIds };

  await updateEntity(entityId, patch);
  revalidateArgus();
  revalidatePath(`/argus/network/${entityId}`);
  revalidatePath(`/argus/v2/organizations/${entityId}`);
  revalidatePath(`/argus/v2/projects/${entityId}`);
  revalidatePath(`/argus/v2/browse/topics`);
  revalidatePath(`/argus/v2/browse/events`);
  revalidatePath("/argus/v2");
}

export async function createEntityAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "person");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) {
    redirect("/argus/network?error=name");
  }
  if (!isCreatableReferenceKind(kindRaw)) {
    redirect("/argus/network?error=kind");
  }

  try {
    const entity = await persistNewEntity(kindRaw as ReferenceKind, name, notes);
    if (entity.href.startsWith("/argus/projects/")) {
      redirect(entity.href);
    }
    redirect(entity.href);
  } catch (err) {
    handleWriteError(err, "/argus/network");
  }
}

export async function updateEntityAction(formData: FormData): Promise<void> {
  const entityId = String(formData.get("entityId") ?? "");
  const entity = await getEntity(entityId);
  if (!entity) {
    redirect("/argus/network");
  }

  const rawValue = Number(formData.get("strategicValue") ?? entity.strategicValue ?? 3);
  const strategicValue = (
    rawValue >= 1 && rawValue <= 5 ? rawValue : entity.strategicValue ?? 3
  ) as StrategicValue;
  const contactValue = normalizeContactValueKeys(formData.getAll("contactValue").map(String));
  const myValue = normalizeMyValueKeys(formData.getAll("myValue").map(String));

  let notes = String(formData.get("notes") ?? "").trim();
  const kind = referenceKindFromNotes(entity.notes);
  if (kind === "topic" || kind === "event") {
    notes = buildReferenceNotes(kind, notes);
  }

  const linkedEntityIds = formData.getAll("linkedEntityIds").map(String);
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();

  await updateEntity(entityId, {
    strategicValue,
    contactValue,
    myValue,
    alias: String(formData.get("alias") ?? "").trim(),
    notes,
    linkedEntityIds,
    ...(kind === "event"
      ? {
          startDate,
          endDate,
        }
      : {}),
  });

  revalidateArgus();
  revalidatePath(`/argus/network/${entityId}`);
  revalidatePath(`/argus/v2/network/${entityId}`);
  redirect(`/argus/v2/network/${entityId}`);
}

export async function updateRelationshipMetricsAction(formData: FormData): Promise<void> {
  const entityId = String(formData.get("entityId") ?? "");
  const entity = await getEntity(entityId);
  if (!entity) return;

  const contactValue = normalizeContactValueKeys(formData.getAll("contactValue").map(String));
  const myValue = normalizeMyValueKeys(formData.getAll("myValue").map(String));

  await updateEntity(entityId, { contactValue, myValue });

  revalidateArgus();
  revalidatePath(`/argus/network/${entityId}`);
  revalidatePath(`/argus/v2/network/${entityId}`);
  revalidatePath("/argus/v2/browse/network");
}

export async function updateProjectAction(formData: FormData): Promise<void> {
  const entityId = String(formData.get("entityId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect(`/argus/projects/${entityId}?error=name`);
  }

  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const linkedPersonIds = formData.getAll("linkedPersonIds").map(String);
  const linkedTopicIds = formData.getAll("linkedTopicIds").map(String);
  const linkedEventIds = formData.getAll("linkedEventIds").map(String);
  const linkedTags = parseTopics(String(formData.get("linkedTags") ?? ""));

  await updateEntity(entityId, {
    name,
    startDate,
    endDate,
    linkedPersonIds,
    linkedTopicIds,
    linkedEventIds,
    linkedTags,
  });

  revalidateArgus();
  revalidatePath(`/argus/projects/${entityId}`);
  redirect(`/argus/projects/${entityId}`);
}

export async function renameProjectAction(formData: FormData): Promise<void> {
  await requireArgusSession();
  const entityId = String(formData.get("entityId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2/browse/projects");

  if (!name) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=name`);
  }

  const entity = await getEntity(entityId);
  if (!entity || entity.type !== "project") {
    redirect(returnTo);
  }

  await updateEntity(entityId, { name });
  revalidateArgus();
  revalidatePath("/argus/v2/browse/projects");
  revalidatePath(`/argus/v2/projects/${entityId}`);
  revalidatePath(`/argus/projects/${entityId}`);
  redirect(returnTo);
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  await requireArgusSession();
  const entityId = String(formData.get("entityId") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2/browse/projects");

  const entity = await getEntity(entityId);
  if (!entity || entity.type !== "project") {
    redirect(returnTo);
  }

  if (confirmName.toLowerCase() !== entity.name.trim().toLowerCase()) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=confirm`);
  }

  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const needsPin =
    argusPrivateConfigured() &&
    projectHasPrivateEvidence(data, inboxItems, entity) &&
    !(await hasArgusPrivateUnlock());

  if (needsPin && !verifyArgusPrivatePin(pin)) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=pin`);
  }

  await deleteEntity(entityId);
  revalidateArgus();
  revalidatePath("/argus/v2/browse/projects");
  revalidatePath(`/argus/v2/projects/${entityId}`);
  redirect(returnTo);
}

export async function updateTopicAliasesAction(formData: FormData): Promise<void> {
  await requireArgusSession();
  const entityId = String(formData.get("entityId") ?? "");
  const linkedTags = parseTopics(String(formData.get("linkedTags") ?? ""));
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2/browse/topics");

  const entity = await getEntity(entityId);
  if (!entity || entity.type !== "other" || referenceKindFromNotes(entity.notes ?? "") !== "topic") {
    redirect(returnTo);
  }

  await updateEntity(entityId, { linkedTags });
  revalidateArgus();
  revalidatePath("/argus/v2/browse/topics");
  revalidatePath("/argus/v2/inbox");
  revalidatePath("/argus/v2");
  redirect(returnTo);
}

export async function deleteLogAction(formData: FormData): Promise<void> {
  const logId = String(formData.get("logId") ?? "");
  await deleteLog(logId);
  revalidateArgus();
  redirect("/argus/v2");
}

export async function deleteEntityAction(formData: FormData): Promise<void> {
  const entityId = String(formData.get("entityId") ?? "");
  await deleteEntity(entityId);
  revalidateArgus();
  revalidatePath(`/argus/projects/${entityId}`);
  redirect("/argus/network");
}

export async function deleteInboxAction(formData: FormData): Promise<void> {
  const inboxId = String(formData.get("inboxId") ?? "");
  await deleteInboxItem(inboxId);
  revalidateArgus();
  const returnTo = String(formData.get("returnTo") ?? "inbox");
  redirect(returnTo === "journal" ? "/argus/v2" : "/argus/inbox");
}

export async function toggleRunbookItemAction(
  runbookId: string,
  itemId: string,
  done: boolean
): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const items = runbook.items.map((item) =>
    item.id === itemId
      ? { ...item, done, doneAt: done ? runbookStamp() : "" }
      : item
  );

  await updateRunbook(runbookId, { items });
  revalidateArgus();
  revalidatePath(`/argus/v2/runbooks/${runbookId}`);
  for (const entityId of runbook.linkedEntityIds) {
    revalidatePath(`/argus/v2/projects/${entityId}`);
    revalidatePath(`/argus/v2/organizations/${entityId}`);
  }
}

export async function clearAllArgusDataAction(): Promise<void> {
  if (!isDestructiveAllowed()) {
    redirect("/argus/v2?error=destructive");
  }
  try {
    await clearAllArgusData();
  } catch (err) {
    if (err instanceof Error && err.message.includes("Supabase")) {
      redirect("/argus/v2?error=supabase-destructive");
    }
    throw err;
  }
  revalidateArgus();
  redirect("/argus/v2");
}
