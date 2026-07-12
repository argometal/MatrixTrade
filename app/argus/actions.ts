"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured, verifyArgusPrivatePin } from "@/lib/auth/passwords";
import { assertDeleteAllowed, assertEntityDeleteAllowed } from "@/lib/argus/delete-gate";
import { resolveEntityPrivateEvidence } from "@/lib/argus/entity-private-evidence";
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
  renameTagGlobally,
} from "@/lib/argus/server-storage";
import type { EntityType, JournalKind, LogSource, RunbookItem, StrategicValue } from "@/lib/argus/types";
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
  entityTypeToReferenceKind,
  referenceKindFromNotes,
  referenceKindToCreateInput,
  createInputToReferenceKind,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import { buildEventShellNotes, eventAnchorDate, normalizeEventTags } from "@/lib/argus/v2/event-chronicle";
import { migrateLegacyEventRecordIfNeeded } from "@/lib/argus/v2/migrate-event-chronicle";
import { attachFilesToLog, attachmentSummaryNames, filesFromFormData } from "@/lib/argus/attachment-log";
import { filterLinkIdsForSource } from "@/lib/argus/link-hierarchy";
import { partitionIdsByEntityKind } from "@/lib/argus/v2/entity-link-counts";
import type { UnifiedCreatePayload, UnifiedCreateResult } from "@/lib/argus/create-flow-types";
import {
  buildRunbookItemsFromText,
  createRunbookCard,
  createRunbookSubtask,
  flattenRunbookSubtasks,
  newRunbookItemId,
  normalizeRunbookSubtasks,
  runbookStamp,
} from "@/lib/argus/runbook-helpers";
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
import { applyNetworkAiBlock } from "@/lib/argus/apply-network-ai-block";
import { parseNetworkAiBlock } from "@/lib/argus/network-ai-block";

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
    const files = filesFromFormData(formData);
    const legacyFile = formData.get("attachment");
    if (legacyFile instanceof File && legacyFile.size > 0) {
      files.push(legacyFile);
    }

    if (!input.body.trim() && files.length === 0) {
      redirect("/argus/v2?capture=1&error=content");
    }

    const body = input.body.trim() || `Attached: ${attachmentSummaryNames(files)}`;
    const title = input.title || autoTitleFromBody(body);

    const log = await createLog({
      ...input,
      body,
      title,
      entityIds,
      classificationStatus: resolveClassificationStatus(entityIds),
      attachmentIds: [],
    });

    await attachFilesToLog(log.id, files);

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

/** Archive multiple inbox items (evidence triage — no redirect). */
export async function bulkArchiveInboxAction(inboxIds: string[]): Promise<{ ok: true; count: number }> {
  await requireArgusSession();
  const ids = [...new Set(inboxIds.filter(Boolean))];
  let count = 0;
  for (const id of ids) {
    const archived = await archiveInboxItem(id);
    if (archived) count += 1;
  }
  revalidateArgus();
  revalidatePath("/argus/v2/inbox");
  return { ok: true, count };
}

/** Merge tags into multiple inbox items (additive). */
export async function bulkMergeInboxTopicsAction(
  inboxIds: string[],
  tagsToAdd: string[]
): Promise<{ ok: true; count: number }> {
  await requireArgusSession();
  const ids = [...new Set(inboxIds.filter(Boolean))];
  const tags = [...new Set(tagsToAdd.map((t) => t.trim()).filter(Boolean))];
  if (ids.length === 0 || tags.length === 0) return { ok: true, count: 0 };

  let count = 0;
  for (const id of ids) {
    const item = await getInboxItem(id, true);
    if (!item || item.status === "archived") continue;
    const merged = [...new Set([...(item.topics ?? []), ...tags])];
    await updateInboxTriage(id, { topics: merged });
    count += 1;
  }
  revalidateArgus();
  revalidatePath("/argus/v2/inbox");
  return { ok: true, count };
}

/** Soft-delete multiple inbox items — code unlock for unlinked; authenticator for linked evidence. */
export async function bulkDeleteInboxAction(
  inboxIds: string[]
): Promise<
  | { ok: true; count: number }
  | { error: "delete_code_locked" | "delete_auth_locked" | "totp_not_configured" }
> {
  await requireArgusSession();
  const data = await readArgus();
  const ids = [...new Set(inboxIds.filter(Boolean))];

  for (const id of ids) {
    const item = await getInboxItem(id, true);
    if (!item) continue;
    const gate = await assertDeleteAllowed(data.entities, item.linkedEntityIds);
    if ("error" in gate) return { error: gate.error };
  }

  let count = 0;
  for (const id of ids) {
    const deleted = await deleteInboxItem(id);
    if (deleted) count += 1;
  }
  revalidateArgus();
  revalidatePath("/argus/v2/inbox");
  return { ok: true, count };
}

/** Append a chronicle note on an event (tags, text, optional file attachments). */
export async function appendEventChronicleEntryAction(
  formData: FormData
): Promise<{ ok: true; appended: boolean }> {
  await requireArgusSession();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const linkedTags = parseTopics(String(formData.get("linkedTags") ?? ""));
  const files = filesFromFormData(formData);

  if (!eventId) throw new Error("Event not found");

  await migrateLegacyEventRecordIfNeeded(eventId);

  const entity = await getEntity(eventId);
  if (!entity || referenceKindFromNotes(entity.notes ?? "") !== "event") {
    throw new Error("Event not found");
  }

  const tags = normalizeEventTags(linkedTags);
  const trimmed = body.trim();
  const eventDate = eventAnchorDate(entity);
  const hasFiles = files.length > 0;

  await updateEntity(eventId, {
    notes: buildEventShellNotes(),
    linkedTags: tags,
  });

  if (trimmed || hasFiles) {
    const logBody = trimmed || `Attached: ${attachmentSummaryNames(files)}`;
    const log = await createLog({
      kind: "log",
      date: eventDate,
      title: autoTitleFromBody(logBody),
      body: logBody,
      entityIds: [eventId],
      topics: tags,
      source: "manual",
      private: false,
      attachmentIds: [],
      classificationStatus: "classified",
    });
    await attachFilesToLog(log.id, files);
  }

  revalidateArgus();
  revalidatePath("/argus/v2/browse/events");
  return { ok: true, appended: Boolean(trimmed || hasFiles) };
}

/** Link an inbox email to an event (evidence chain). */
export async function linkInboxEmailToEventAction(
  inboxId: string,
  eventId: string
): Promise<{ ok: true }> {
  await requireArgusSession();
  const item = await getInboxItem(inboxId, true);
  if (!item) throw new Error("Email not found");
  const next = [...new Set([...(item.linkedEntityIds ?? []), eventId])];
  await linkInboxToEntities(inboxId, next);
  revalidateArgus();
  revalidatePath("/argus/v2/inbox");
  revalidatePath("/argus/v2/browse/events");
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
    throw new ArgusPersistenceError("validation", "Add at least one card.");
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

const NETWORK_LAST_CONTACT_TITLE = "Last contact";

/** Quick touch date from Network browse — upserts one follow-up record per person. */
export async function recordNetworkLastContactAction(
  personId: string,
  contactDate: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireArgusSession();
    const date = contactDate.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, error: "Invalid date" };
    }

    const person = await getEntity(personId);
    if (!person || person.type !== "person" || person.deletedAt) {
      return { ok: false, error: "Person not found" };
    }

    const data = await readArgus();
    const existing = data.logs.find(
      (log) =>
        !log.deletedAt &&
        log.kind === "follow_up" &&
        log.source === "manual" &&
        log.title === NETWORK_LAST_CONTACT_TITLE &&
        log.entityIds.includes(personId)
    );

    if (existing) {
      await updateLog(existing.id, {
        title: NETWORK_LAST_CONTACT_TITLE,
        body: existing.body || "Logged from Network.",
        kind: "follow_up",
        date,
        followUpDate: date,
        entityIds: existing.entityIds,
        topics: existing.topics ?? [],
        private: existing.private,
      });
    } else {
      await createLog({
        kind: "follow_up",
        date,
        followUpDate: date,
        title: NETWORK_LAST_CONTACT_TITLE,
        body: "Logged from Network.",
        entityIds: [personId],
        classificationStatus: "classified",
        private: false,
        source: "manual",
        attachmentIds: [],
        topics: [],
      });
    }

    revalidateArgus();
    revalidatePath("/argus/v2/browse/network");
    revalidatePath(`/argus/v2/network/${personId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}

export type ImportNetworkAiBlockResult =
  | { ok: true; message: string; logId?: string; entityId?: string }
  | { ok: false; error: string; details?: string[] };

/** Parse and apply a network AI block — only from explicit human Apply. */
export async function importNetworkAiBlockAction(
  formData: FormData
): Promise<ImportNetworkAiBlockResult> {
  try {
    await requireArgusSession();
    const raw = String(formData.get("aiBlock") ?? "").trim();
    const parsed = parseNetworkAiBlock(raw);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, details: parsed.details };
    }

    const data = await readArgus();
    const result = await applyNetworkAiBlock(
      {
        getEntity,
        createLog,
        updateEntity,
        createEntity,
        resolveOrganizationId: async (name) => {
          const org = data.entities.find(
            (entity) =>
              entity.type === "company" &&
              !entity.deletedAt &&
              entity.name.trim().toLowerCase() === name.trim().toLowerCase()
          );
          return org?.id;
        },
      },
      parsed.payload
    );
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const entityId = result.entityId ?? String(parsed.payload.proposal.entityId ?? "");
    revalidateArgus();
    revalidatePath("/argus/v2/browse/network");
    if (entityId) {
      revalidatePath(`/argus/v2/network/${entityId}`);
      revalidatePath(`/argus/network/${entityId}`);
    }

    return { ok: true, message: result.message, logId: result.logId, entityId: result.entityId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Import failed",
    };
  }
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

export async function renameEntityAction(formData: FormData): Promise<void> {
  await requireArgusSession();
  const entityId = String(formData.get("entityId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2");

  if (!name) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=name`);
  }

  const entity = await getEntity(entityId);
  if (!entity || entity.deletedAt) redirect(returnTo);

  await updateEntity(entityId, { name });
  revalidateArgus();
  revalidatePath("/argus/v2");
  revalidatePath("/argus/v2/browse/organizations");
  revalidatePath("/argus/v2/browse/projects");
  revalidatePath("/argus/v2/browse/topics");
  revalidatePath("/argus/v2/browse/events");
  revalidatePath(`/argus/v2/organizations/${entityId}`);
  revalidatePath(`/argus/v2/projects/${entityId}`);
  revalidatePath(`/argus/v2/network/${entityId}`);
  redirect(returnTo);
}

export async function archiveEntityAction(formData: FormData): Promise<void> {
  await requireArgusSession();
  const entityId = String(formData.get("entityId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2");

  const entity = await getEntity(entityId);
  if (!entity || entity.deletedAt) redirect(returnTo);

  await updateEntity(entityId, { lifecycleStatus: "archived" });
  revalidateArgus();
  revalidatePath("/argus/v2");
  redirect(returnTo);
}

export async function restoreEntityAction(formData: FormData): Promise<void> {
  await requireArgusSession();
  const entityId = String(formData.get("entityId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2");

  const entity = await getEntity(entityId);
  if (!entity || entity.deletedAt) redirect(returnTo);

  await updateEntity(entityId, { lifecycleStatus: "active" });
  revalidateArgus();
  revalidatePath("/argus/v2");
  redirect(returnTo);
}

export async function renameTagAction(formData: FormData): Promise<void> {
  await requireArgusSession();
  const oldTag = String(formData.get("oldTag") ?? "").trim();
  const newTag = String(formData.get("newTag") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2");

  if (!oldTag || !newTag) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=tag`);
  }

  await renameTagGlobally(oldTag, newTag);
  revalidateArgus();
  revalidatePath("/argus/v2");
  revalidatePath("/argus/v2/inbox");
  redirect(returnTo);
}

export async function updateInboxSubjectAction(formData: FormData): Promise<void> {
  await requireArgusSession();
  const inboxId = String(formData.get("inboxId") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2/inbox");

  if (!inboxId) redirect(returnTo);

  await updateInboxTriage(inboxId, { subject });
  revalidateArgus();
  revalidatePath("/argus/v2/inbox");
  redirect(returnTo);
}

export async function deleteEntityV2Action(formData: FormData): Promise<void> {
  await requireArgusSession();
  const entityId = String(formData.get("entityId") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2");

  const entity = await getEntity(entityId);
  if (!entity || entity.deletedAt) {
    redirect(returnTo);
  }

  const kind = entityTypeToReferenceKind(entity.type, entity.notes ?? "");
  if (!["project", "organization", "topic", "event"].includes(kind)) {
    redirect(returnTo);
  }

  if (confirmName.toLowerCase() !== entity.name.trim().toLowerCase()) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=confirm`);
  }

  const gate = await assertEntityDeleteAllowed(entity);
  if ("error" in gate) {
    const param =
      gate.error === "delete_auth_locked"
        ? "delete_auth_error=1"
        : gate.error === "totp_not_configured"
          ? "totp_required=1"
          : "delete_error=1";
    const separator = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${separator}${param}`);
  }

  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const needsPin =
    argusPrivateConfigured() &&
    resolveEntityPrivateEvidence(data, inboxItems, entity) &&
    !(await hasArgusPrivateUnlock());

  if (needsPin && !verifyArgusPrivatePin(pin)) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=pin`);
  }

  await deleteEntity(entityId);
  revalidateArgus();
  revalidatePath("/argus/v2");
  revalidatePath("/argus/v2/browse/projects");
  revalidatePath("/argus/v2/browse/organizations");
  revalidatePath("/argus/v2/browse/topics");
  revalidatePath("/argus/v2/browse/events");
  revalidatePath(`/argus/v2/projects/${entityId}`);
  revalidatePath(`/argus/v2/organizations/${entityId}`);
  redirect(returnTo);
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  await deleteEntityV2Action(formData);
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
  await requireArgusSession();
  const logId = String(formData.get("logId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2");

  const data = await readArgus();
  const log = await getLog(logId, true);
  if (!log) {
    redirect(returnTo.startsWith("/argus/") ? returnTo : "/argus/v2");
  }

  const gate = await assertDeleteAllowed(data.entities, log.entityIds);
  if ("error" in gate) {
    const param =
      gate.error === "delete_auth_locked"
        ? "delete_auth_error=1"
        : gate.error === "totp_not_configured"
          ? "totp_required=1"
          : "delete_error=1";
    const separator = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${separator}${param}`);
  }

  await deleteLog(logId);
  revalidateArgus();
  redirect(returnTo.startsWith("/argus/") ? returnTo : "/argus/v2");
}

export async function deleteEntityAction(formData: FormData): Promise<void> {
  await deleteEntityV2Action(formData);
}

export async function deleteInboxAction(formData: FormData): Promise<void> {
  await requireArgusSession();
  const inboxId = String(formData.get("inboxId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/argus/v2/inbox");

  const data = await readArgus();
  const item = await getInboxItem(inboxId, true);
  if (!item) {
    redirect(returnTo.startsWith("/argus/") ? returnTo : "/argus/v2/inbox");
  }

  const gate = await assertDeleteAllowed(data.entities, item.linkedEntityIds);
  if ("error" in gate) {
    const param =
      gate.error === "delete_auth_locked"
        ? "delete_auth_error=1"
        : gate.error === "totp_not_configured"
          ? "totp_required=1"
          : "delete_error=1";
    const separator = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${separator}${param}`);
  }

  await deleteInboxItem(inboxId);
  revalidateArgus();
  revalidatePath("/argus/v2/inbox");
  redirect(returnTo.startsWith("/argus/") ? returnTo : "/argus/v2/inbox");
}

async function revalidateRunbookSurfaces(runbookId: string, linkedEntityIds: string[]): Promise<void> {
  revalidateArgus();
  revalidatePath(`/argus/v2/runbooks/${runbookId}`);
  for (const entityId of linkedEntityIds) {
    revalidatePath(`/argus/v2/projects/${entityId}`);
    revalidatePath(`/argus/v2/organizations/${entityId}`);
  }
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
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function addRunbookCardAction(runbookId: string, text: string): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const card = createRunbookCard(text);
  if (!card.text) {
    throw new ArgusPersistenceError("validation", "Card text is required.");
  }

  await updateRunbook(runbookId, { items: [...runbook.items, card] });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function addRunbookSubtaskAction(
  runbookId: string,
  itemId: string,
  text: string
): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const subtask = createRunbookSubtask(text);
  if (!subtask.text) {
    throw new ArgusPersistenceError("validation", "Subtask text is required.");
  }

  let found = false;
  const items = runbook.items.map((item) => {
    if (item.id !== itemId || item.type === "sep") return item;
    found = true;
    return {
      ...item,
      subtasks: [...(item.subtasks ?? []), subtask],
    };
  });

  if (!found) {
    throw new ArgusPersistenceError("validation", "Card not found.");
  }

  await updateRunbook(runbookId, { items });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function toggleRunbookSubtaskAction(
  runbookId: string,
  itemId: string,
  subtaskId: string,
  done: boolean
): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  let found = false;
  const items = runbook.items.map((item) => {
    if (item.id !== itemId) return item;
    const subtasks = (item.subtasks ?? []).map((subtask) => {
      if (subtask.id !== subtaskId) return subtask;
      found = true;
      return { ...subtask, done, doneAt: done ? runbookStamp() : "" };
    });
    return { ...item, subtasks };
  });

  if (!found) {
    throw new ArgusPersistenceError("validation", "Subtask not found.");
  }

  await updateRunbook(runbookId, { items });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function removeDoneRunbookItemsAction(runbookId: string): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const items = runbook.items.filter((item) => item.type === "sep" || !item.done);
  await updateRunbook(runbookId, { items });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function uncheckAllRunbookItemsAction(runbookId: string): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const items = runbook.items.map((item) =>
    item.type === "sep" ? item : { ...item, done: false, doneAt: "" }
  );
  await updateRunbook(runbookId, { items });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function checkAllRunbookItemsAction(runbookId: string): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const stamp = runbookStamp();
  const items = runbook.items.map((item) =>
    item.type === "sep" ? item : { ...item, done: true, doneAt: stamp }
  );
  await updateRunbook(runbookId, { items });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function renameRunbookItemAction(
  runbookId: string,
  itemId: string,
  text: string
): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new ArgusPersistenceError("validation", "Card text is required.");
  }

  let found = false;
  const items = runbook.items.map((item) => {
    if (item.id !== itemId || item.type === "sep") return item;
    found = true;
    return { ...item, text: trimmed };
  });

  if (!found) {
    throw new ArgusPersistenceError("validation", "Card not found.");
  }

  await updateRunbook(runbookId, { items });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function renameRunbookTitleAction(runbookId: string, title: string): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const trimmed = title.trim();
  if (!trimmed) {
    throw new ArgusPersistenceError("validation", "Title is required.");
  }

  await updateRunbook(runbookId, { title: trimmed });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function appendRunbookCardsFromTextAction(runbookId: string, text: string): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const newItems = buildRunbookItemsFromText(text);
  if (newItems.length === 0) {
    throw new ArgusPersistenceError("validation", "No lines to append.");
  }

  await updateRunbook(runbookId, { items: [...runbook.items, ...newItems] });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function rebuildRunbookFromTextAction(runbookId: string, text: string): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const items = buildRunbookItemsFromText(text);
  if (items.filter((item) => item.type === "item").length === 0) {
    throw new ArgusPersistenceError("validation", "Add at least one card.");
  }

  await updateRunbook(runbookId, { items });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function flattenRunbookSubtasksAction(runbookId: string): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const items = flattenRunbookSubtasks(runbook.items);
  await updateRunbook(runbookId, { items });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

export async function moveRunbookItemAction(
  runbookId: string,
  itemId: string,
  direction: -1 | 1
): Promise<void> {
  await requireArgusSession();
  const runbook = await getRunbook(runbookId);
  if (!runbook) {
    throw new ArgusPersistenceError("validation", "Runbook not found.");
  }

  const index = runbook.items.findIndex((item) => item.id === itemId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= runbook.items.length) {
    return;
  }

  const items = [...runbook.items];
  [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
  await updateRunbook(runbookId, { items });
  await revalidateRunbookSurfaces(runbookId, runbook.linkedEntityIds);
}

function normalizeImportedRunbookItems(raw: unknown): RunbookItem[] {
  if (!Array.isArray(raw)) {
    throw new ArgusPersistenceError("validation", "Import error: items must be an array.");
  }

  return raw.map((entry, index) => {
    const item = entry as Record<string, unknown>;
    const type = item.type === "sep" ? "sep" : "item";
    const text = String(item.text ?? "").trim();
    return {
      id: String(item.id || newRunbookItemId(`imp${index}_`)),
      text,
      done: !!item.done,
      doneAt: String(item.doneAt ?? ""),
      type,
      subtasks: normalizeRunbookSubtasks(item.subtasks as RunbookItem["subtasks"]),
    };
  });
}

export async function importRunbookJsonAction(
  json: string,
  targetRunbookId?: string
): Promise<{ id: string; href: string; title: string }> {
  await requireArgusSession();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new ArgusPersistenceError("validation", "Import error: invalid JSON.");
  }

  const payload = (data.runbook ?? data.checklist ?? data) as Record<string, unknown>;
  if (!payload || typeof payload !== "object") {
    throw new ArgusPersistenceError("validation", "Import error: missing runbook data.");
  }

  const title = String(payload.title ?? "").trim();
  if (!title) {
    throw new ArgusPersistenceError("validation", "Import error: title is required.");
  }

  const items = normalizeImportedRunbookItems(payload.items);
  if (items.filter((item) => item.type === "item").length === 0) {
    throw new ArgusPersistenceError("validation", "Import error: at least one card is required.");
  }

  const linkedEntityIds = Array.isArray(payload.linkedEntityIds)
    ? payload.linkedEntityIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  if (targetRunbookId) {
    const runbook = await getRunbook(targetRunbookId);
    if (!runbook) {
      throw new ArgusPersistenceError("validation", "Runbook not found.");
    }

    await updateRunbook(targetRunbookId, { title, items });
    await revalidateRunbookSurfaces(targetRunbookId, runbook.linkedEntityIds);
    return {
      id: targetRunbookId,
      href: `/argus/v2/runbooks/${targetRunbookId}`,
      title,
    };
  }

  const runbook = await createRunbook({
    title,
    items,
    linkedEntityIds,
  });
  await revalidateRunbookSurfaces(runbook.id, runbook.linkedEntityIds);
  return {
    id: runbook.id,
    href: `/argus/v2/runbooks/${runbook.id}`,
    title: runbook.title,
  };
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
