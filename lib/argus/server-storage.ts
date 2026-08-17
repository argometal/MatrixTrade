import { promises as fs } from "fs";
import path from "path";
import {
  ArgusWriteBlockedError,
  getStorageSafetyStatus,
  isDestructiveAllowed,
  writeArgusSafe,
  type WriteIntent,
} from "./data-safety";
import { migrateToV3 } from "./migrate";
import { ensureArgusStorageReady, getArgusStoragePaths, isExternalDataRoot } from "./storage";
import type {
  ArgusData,
  Attachment,
  AttachmentParentType,
  Entity,
  EntityInput,
  InboxItem,
  InboxItemInput,
  Log,
  LogInput,
  Runbook,
  RunbookInput,
} from "./types";
import { resolveClassificationStatus } from "./normalize";
import { normalizeTagList, normalizeTagDisplay, tagKey } from "./tag-ontology";
import {
  applyBinderTagSync,
  diffTagLists,
  ensureTagsInPipeline as ensureTagsInPipelineSync,
  mergeEvidenceTagsIntoBinders,
  pruneBinderTagsMissingEvidence,
  reconcileTagPipeline,
  registerHomeVocabulary,
  type TagPipelineResult,
} from "./v2/tag-pipeline";
import { inboxStatusAfterLinkChange } from "./v2/inbox-loaders";
import {
  filterLinkIdsForSource,
  linkSourceKindFromEntity,
  type LinkContext,
} from "./link-hierarchy";
import { referenceKindFromNotes } from "./reference-types";
import { ArgusPersistenceError } from "./persistence/errors";
import { isActiveRecord, softDeleteEntity, softDeleteLog, softDeleteInboxItem } from "./supabase-protection/protected-counts";
import {
  canAccessProtectedRecord,
  filterPrivateInbox,
  filterPrivateLogs,
} from "./private-access";
import {
  isSupabaseDestructiveBlocked,
  supabaseDestructiveBlockedMessage,
} from "./supabase-protection/policy";
import { isCloudInboxStore } from "./inbox-store/config";
import * as cloudInbox from "./inbox-store/supabase";
import { isCloudJournalStore } from "./journal-store/config";
import * as cloudJournal from "./journal-store/supabase";
import * as cloudJournalFiles from "./journal-store/attachments";
import {
  journalNeedsSignalTagsMigration,
  normalizeSignalTags,
  signalTagKey,
} from "./signal-tags";

function paths() {
  return getArgusStoragePaths();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyArgus(): ArgusData {
  return {
    entities: [],
    logs: [],
    inboxItems: [],
    attachments: [],
    runbooks: [],
    runbookProgress: [],
    signalTags: [],
    globalTags: [],
    version: 3,
  };
}

async function ensureFilesDir(): Promise<void> {
  await ensureArgusStorageReady();
  await fs.mkdir(paths().filesDir, { recursive: true });
}

function applyJournalMigrations(data: ArgusData): { data: ArgusData; changed: boolean } {
  const linked = reconcileTagPipeline(data, {
    nowIso: new Date().toISOString(),
    newId: generateId,
  });
  return { data, changed: linked.changed };
}

async function readRawJournal(): Promise<ArgusData> {
  if (isCloudJournalStore()) {
    const cloud = await cloudJournal.readJournalFromSupabase();
    if (cloud) {
      const needsSignal = journalNeedsSignalTagsMigration(cloud);
      const migrated = migrateToV3(cloud);
      const { changed } = applyJournalMigrations(migrated);
      if (needsSignal || changed) await writeArgus(migrated, "bootstrap");
      return migrated;
    }

    await ensureArgusStorageReady();
    const p = paths();
    try {
      const raw = JSON.parse(await fs.readFile(p.journalFile, "utf-8")) as ArgusData;
      const needsSignal = journalNeedsSignalTagsMigration(raw);
      const migrated = migrateToV3(raw);
      const { changed } = applyJournalMigrations(migrated);
      if (needsSignal || changed) await writeArgus(migrated, "bootstrap");
      return migrated;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw err;
    }
    return emptyArgus();
  }

  await ensureArgusStorageReady();
  const p = paths();

  try {
    const raw = JSON.parse(await fs.readFile(p.journalFile, "utf-8")) as ArgusData;
    const needsSignal = journalNeedsSignalTagsMigration(raw);
    const migrated = migrateToV3(raw);
    const { changed } = applyJournalMigrations(migrated);
    if (needsSignal || changed) await writeArgus(migrated, "bootstrap");
    return migrated;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }

  try {
    const raw = await fs.readFile(p.legacyVaultFile, "utf-8");
    const migrated = migrateToV3(JSON.parse(raw));
    await writeArgus(migrated, "bootstrap");
    return migrated;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyArgus();
    throw err;
  }
}

async function writeArgus(data: ArgusData, intent: WriteIntent = "mutation"): Promise<void> {
  await ensureArgusStorageReady();
  const p = paths();

  if (isCloudJournalStore()) {
    const currentJsonForBackup = await cloudJournal.readJournalBackupFromSupabase();
    await writeArgusSafe(data, {
      intent,
      journalFile: p.journalFile,
      cloudWrite: (payload) => cloudJournal.writeJournalToSupabase(payload),
      currentJsonForBackup,
    });
    return;
  }

  await writeArgusSafe(data, { intent, journalFile: p.journalFile });
}


export async function readArgus(): Promise<ArgusData> {
  return readRawJournal();
}

// --- Entities ---

export async function getEntities(): Promise<Entity[]> {
  const data = await readArgus();
  return data.entities.filter(isActiveRecord).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEntity(id: string): Promise<Entity | undefined> {
  const data = await readArgus();
  const entity = data.entities.find((e) => e.id === id);
  if (!entity || !isActiveRecord(entity)) return undefined;
  return entity;
}

export async function searchEntities(query: string): Promise<Entity[]> {
  const q = query.trim().toLowerCase();
  if (!q) return getEntities();
  const data = await readArgus();
  return data.entities
    .filter(isActiveRecord)
    .filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.alias ?? "").toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createEntity(input: EntityInput): Promise<Entity> {
  const data = await readArgus();
  const now = new Date().toISOString();
  const entity: Entity = {
    ...input,
    alias: input.alias ?? "",
    strategicValue: input.strategicValue ?? 3,
    contactValue: input.contactValue ?? [],
    myValue: input.myValue ?? [],
    linkedPersonIds: input.linkedPersonIds ?? [],
    linkedTopicIds: input.linkedTopicIds ?? [],
    linkedEventIds: input.linkedEventIds ?? [],
    linkedEntityIds: input.linkedEntityIds ?? [],
    linkedTags: input.linkedTags ?? [],
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  data.entities.push(entity);
  try {
    await writeArgus(data);
  } catch (err) {
    throw err instanceof ArgusWriteBlockedError
      ? new ArgusPersistenceError(
          "supabase",
          "Journal write blocked — Supabase journal store is not active on this host.",
          { cause: err }
        )
      : err;
  }

  const fresh = await readArgus();
  const saved = fresh.entities.find((e) => e.id === entity.id && isActiveRecord(e));
  if (!saved) {
    throw new ArgusPersistenceError(
      "database",
      `Entity "${entity.name}" was not found after database write confirmation.`
    );
  }
  return saved;
}

export type EntityUpdatePatch = Partial<
  Pick<
    Entity,
    | "strategicValue"
    | "contactValue"
    | "myValue"
    | "alias"
    | "notes"
    | "name"
    | "startDate"
    | "endDate"
    | "linkedPersonIds"
    | "linkedTopicIds"
    | "linkedEventIds"
    | "linkedEntityIds"
    | "linkedTags"
    | "projectTags"
    | "topicTags"
    | "eventTags"
    | "lifecycleStatus"
  >
>;

function normalizeOptionalDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim().slice(0, 10);
  return trimmed || undefined;
}

function normalizeLinkedPersonIds(data: ArgusData, ids: string[] | undefined): string[] {
  return filterLinkIdsForSource(
    data.entities.filter(isActiveRecord),
    "project",
    ids
  ).filter((id) => {
    const entity = data.entities.find((entry) => entry.id === id);
    return entity?.type === "person" || entity?.type === "company";
  });
}

function normalizeLinkedTopicIds(data: ArgusData, ids: string[] | undefined): string[] {
  return filterLinkIdsForSource(data.entities.filter(isActiveRecord), "project", ids).filter((id) => {
    const entity = data.entities.find((entry) => entry.id === id);
    return entity && referenceKindFromNotes(entity.notes ?? "") === "topic";
  });
}

function normalizeLinkedEventIds(
  data: ArgusData,
  ids: string[] | undefined,
  context: LinkContext
): string[] {
  return filterLinkIdsForSource(data.entities.filter(isActiveRecord), "project", ids, context).filter((id) => {
    const entity = data.entities.find((entry) => entry.id === id);
    return entity && referenceKindFromNotes(entity.notes ?? "") === "event";
  });
}

function normalizeLinkedEntityIds(data: ArgusData, entity: Entity, ids: string[] | undefined): string[] {
  void entity;
  return filterLinkIdsForSource(data.entities.filter(isActiveRecord), "create", ids);
}

function normalizeLinkedTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(tag);
  }
  return normalized;
}

export async function updateEntity(id: string, patch: EntityUpdatePatch): Promise<Entity | undefined> {
  const data = await readArgus();
  const idx = data.entities.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;

  const current = data.entities[idx];
  const sv = patch.strategicValue;
  const strategicValue = sv !== undefined && sv >= 1 && sv <= 5 ? sv : current.strategicValue;
  const name = patch.name !== undefined ? patch.name.trim() : current.name;
  const linkContext: LinkContext = {
    projectStart:
      patch.startDate !== undefined ? normalizeOptionalDate(patch.startDate) : current.startDate,
    projectEnd: patch.endDate !== undefined ? normalizeOptionalDate(patch.endDate) : current.endDate,
  };

  data.entities[idx] = {
    ...current,
    name: name || current.name,
    strategicValue,
    contactValue: patch.contactValue !== undefined ? patch.contactValue : current.contactValue ?? [],
    myValue: patch.myValue !== undefined ? patch.myValue : current.myValue ?? [],
    alias: patch.alias ?? current.alias ?? "",
    notes: patch.notes ?? current.notes ?? "",
    startDate: patch.startDate !== undefined ? normalizeOptionalDate(patch.startDate) : current.startDate,
    endDate: patch.endDate !== undefined ? normalizeOptionalDate(patch.endDate) : current.endDate,
    linkedPersonIds:
      patch.linkedPersonIds !== undefined
        ? normalizeLinkedPersonIds(data, patch.linkedPersonIds)
        : current.linkedPersonIds ?? [],
    linkedTopicIds:
      patch.linkedTopicIds !== undefined
        ? normalizeLinkedTopicIds(data, patch.linkedTopicIds)
        : current.linkedTopicIds ?? [],
    linkedEventIds:
      patch.linkedEventIds !== undefined
        ? normalizeLinkedEventIds(data, patch.linkedEventIds, linkContext)
        : current.linkedEventIds ?? [],
    linkedEntityIds:
      patch.linkedEntityIds !== undefined
        ? normalizeLinkedEntityIds(data, current, patch.linkedEntityIds)
        : current.linkedEntityIds ?? [],
    linkedTags:
      patch.linkedTags !== undefined ? normalizeLinkedTags(patch.linkedTags) : current.linkedTags ?? [],
    projectTags:
      patch.projectTags !== undefined ? normalizeLinkedTags(patch.projectTags) : current.projectTags ?? [],
    topicTags:
      patch.topicTags !== undefined ? normalizeLinkedTags(patch.topicTags) : current.topicTags ?? [],
    eventTags:
      patch.eventTags !== undefined ? normalizeLinkedTags(patch.eventTags) : current.eventTags ?? [],
    lifecycleStatus:
      patch.lifecycleStatus !== undefined ? patch.lifecycleStatus : current.lifecycleStatus,
    updatedAt: new Date().toISOString(),
  };
  await writeArgus(data);
  return data.entities[idx];
}

// --- Attachments ---

export async function saveAttachment(
  fileName: string,
  mimeType: string,
  bytes: Buffer,
  parentType: AttachmentParentType,
  parentId: string
): Promise<Attachment> {
  if (isCloudInboxStore() && parentType === "inbox") {
    return cloudInbox.saveInboxAttachment(fileName, mimeType, bytes, parentId);
  }

  const id = generateId();
  const safeName = fileName.replace(/[^\w.\-() ]/g, "_").slice(0, 120);
  const mime = mimeType || "application/octet-stream";

  if (isCloudJournalStore() && parentType === "journal") {
    await cloudJournalFiles.uploadJournalAttachmentBytes(id, bytes, mime);
  } else {
    await ensureFilesDir();
    await fs.writeFile(path.join(paths().filesDir, id), bytes);
  }

  const data = await readArgus();
  const attachment: Attachment = {
    id,
    fileName: safeName,
    mimeType: mime,
    createdAt: new Date().toISOString(),
    parentType,
    parentId,
  };
  data.attachments.push(attachment);
  await writeArgus(data);
  return attachment;
}

function assignAttachmentParent(
  data: ArgusData,
  attachmentId: string,
  parentType: AttachmentParentType,
  parentId: string
): void {
  const att = data.attachments.find((a) => a.id === attachmentId);
  if (att) {
    att.parentType = parentType;
    att.parentId = parentId;
  }
}

export async function readAttachmentBytes(id: string): Promise<Buffer | null> {
  if (isCloudInboxStore()) {
    const cloud = await cloudInbox.readInboxAttachmentBytes(id);
    if (cloud) return cloud;
  }
  if (isCloudJournalStore()) {
    const journal = await cloudJournalFiles.readJournalAttachmentBytes(id);
    if (journal) return journal;
  }
  try {
    return await fs.readFile(path.join(paths().filesDir, id));
  } catch {
    return null;
  }
}

export async function getAttachment(id: string): Promise<Attachment | undefined> {
  if (isCloudInboxStore()) {
    const cloud = await cloudInbox.getInboxAttachment(id);
    if (cloud) return cloud;
  }
  const data = await readArgus();
  const att = data.attachments.find((a) => a.id === id);
  if (!att || !isActiveRecord(att)) return undefined;
  return att;
}

// --- Logs ---

export async function getLogs(includePrivate: boolean): Promise<Log[]> {
  const data = await readArgus();
  return filterPrivateLogs(data.logs.filter(isActiveRecord), includePrivate).sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

export async function getRecentLogs(limit: number, includePrivate: boolean): Promise<Log[]> {
  return (await getLogs(includePrivate)).slice(0, limit);
}

export async function getLogsByKind(
  kind: Log["kind"],
  includePrivate: boolean,
  limit?: number
): Promise<Log[]> {
  const logs = (await getLogs(includePrivate)).filter((l) => l.kind === kind);
  return limit ? logs.slice(0, limit) : logs;
}

export async function getLog(id: string, includePrivate: boolean): Promise<Log | undefined> {
  const data = await readArgus();
  const log = data.logs.find((l) => l.id === id);
  if (!log || !isActiveRecord(log)) return undefined;
  if (log.private && !includePrivate) return undefined;
  return log;
}

export async function getLogsForEntity(entityId: string, includePrivate: boolean): Promise<Log[]> {
  return (await getLogs(includePrivate)).filter((l) => l.entityIds.includes(entityId));
}

export async function createLog(input: LogInput): Promise<Log> {
  const classificationStatus = resolveClassificationStatus(input.entityIds);
  if (input.entityIds.length === 0 && classificationStatus !== "needs_classification") {
    throw new Error("Entries without entities must be marked needs_classification");
  }

  const data = await readArgus();
  const now = new Date().toISOString();
  const log: Log = {
    ...input,
    classificationStatus,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  data.logs.push(log);
  for (const eid of log.entityIds) {
    const entity = data.entities.find((e) => e.id === eid);
    if (entity) entity.updatedAt = now;
  }
  mergeEvidenceTagsIntoBinders(data, log.entityIds, log.topics ?? []);
  try {
    await writeArgus(data);
  } catch (err) {
    throw err instanceof ArgusWriteBlockedError
      ? new ArgusPersistenceError(
          "supabase",
          "Journal write blocked — Supabase journal store is not active on this host.",
          { cause: err }
        )
      : err;
  }

  const fresh = await readArgus();
  const saved = fresh.logs.find((l) => l.id === log.id && isActiveRecord(l));
  if (!saved) {
    throw new ArgusPersistenceError(
      "database",
      `Evidence "${log.title || log.id}" was not found after database write confirmation.`
    );
  }
  return saved;
}

export async function classifyLog(logId: string, entityIds: string[]): Promise<Log> {
  if (entityIds.length === 0) {
    throw new Error("Assign at least one entity to classify");
  }
  const data = await readArgus();
  const log = data.logs.find((l) => l.id === logId);
  if (!log) throw new Error("Journal entry not found");

  const now = new Date().toISOString();
  log.entityIds = entityIds;
  log.classificationStatus = "classified";
  log.updatedAt = now;
  for (const eid of entityIds) {
    const entity = data.entities.find((e) => e.id === eid);
    if (entity) entity.updatedAt = now;
  }
  await writeArgus(data);
  return log;
}

export async function updateLog(
  id: string,
  input: {
    title: string;
    body: string;
    kind: Log["kind"];
    date: string;
    followUpDate?: string;
    entityIds: string[];
    topics: string[];
    private?: boolean;
  }
): Promise<Log> {
  const data = await readArgus();
  const log = data.logs.find((l) => l.id === id);
  if (!log) throw new Error("Journal entry not found");

  const prevTopics = [...(log.topics ?? [])];
  const prevEntityIds = [...(log.entityIds ?? [])];
  const now = new Date().toISOString();
  log.title = input.title.trim() || log.title;
  log.body = input.body;
  log.kind = input.kind;
  log.date = input.date;
  log.followUpDate = input.followUpDate;
  log.entityIds = input.entityIds;
  log.topics = input.topics;
  if (input.private !== undefined) log.private = input.private;
  log.classificationStatus = resolveClassificationStatus(input.entityIds);
  log.updatedAt = now;
  const { added, removed } = diffTagLists(prevTopics, input.topics);
  const linkedIds = [...new Set([...prevEntityIds, ...input.entityIds])];
  if (added.length > 0) mergeEvidenceTagsIntoBinders(data, input.entityIds, added);
  if (removed.length > 0) pruneBinderTagsMissingEvidence(data, linkedIds, removed);

  for (const eid of input.entityIds) {
    const entity = data.entities.find((e) => e.id === eid);
    if (entity) entity.updatedAt = now;
  }

  await writeArgus(data);
  return log;
}

export async function appendLogAttachment(logId: string, attachmentId: string): Promise<void> {
  const data = await readArgus();
  const log = data.logs.find((l) => l.id === logId);
  if (!log) throw new Error("Journal entry not found");
  if (!log.attachmentIds.includes(attachmentId)) {
    log.attachmentIds.push(attachmentId);
    log.updatedAt = new Date().toISOString();
    await writeArgus(data);
  }
}

export async function appendInboxAttachment(inboxId: string, attachmentId: string): Promise<void> {
  if (isCloudInboxStore()) {
    return cloudInbox.appendInboxAttachment(inboxId, attachmentId);
  }
  const data = await readArgus();
  const item = data.inboxItems.find((i) => i.id === inboxId);
  if (!item) throw new Error("Inbox item not found");
  if (!item.attachmentIds.includes(attachmentId)) {
    item.attachmentIds.push(attachmentId);
    await writeArgus(data);
  }
}

// --- Runbooks (Execution domain) ---

export async function getRunbook(id: string): Promise<Runbook | undefined> {
  const data = await readArgus();
  const runbook = data.runbooks.find((entry) => entry.id === id);
  if (!runbook || !isActiveRecord(runbook)) return undefined;
  return runbook;
}

export async function listRunbooks(): Promise<Runbook[]> {
  const data = await readArgus();
  return data.runbooks
    .filter(isActiveRecord)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
}

export async function createRunbook(input: RunbookInput): Promise<Runbook> {
  const data = await readArgus();
  const now = new Date().toISOString();
  const validIds = filterLinkIdsForSource(data.entities, "create", input.linkedEntityIds ?? []);

  const runbook: Runbook = {
    id: generateId(),
    title: input.title.trim(),
    items: input.items ?? [],
    linkedEntityIds: validIds,
    tags: normalizeTagList(input.tags),
    createdAt: now,
    updatedAt: now,
  };

  data.runbooks.push(runbook);
  for (const entityId of validIds) {
    const entity = data.entities.find((entry) => entry.id === entityId);
    if (entity) entity.updatedAt = now;
  }

  await writeArgus(data);
  return runbook;
}

export async function updateRunbook(
  id: string,
  patch: Partial<Pick<Runbook, "title" | "items" | "linkedEntityIds" | "tags">>
): Promise<Runbook> {
  const data = await readArgus();
  const runbook = data.runbooks.find((entry) => entry.id === id);
  if (!runbook || !isActiveRecord(runbook)) {
    throw new Error("Runbook not found");
  }

  const now = new Date().toISOString();
  if (patch.title !== undefined) runbook.title = patch.title.trim();
  if (patch.items !== undefined) runbook.items = patch.items;
  if (patch.linkedEntityIds !== undefined) {
    runbook.linkedEntityIds = filterLinkIdsForSource(data.entities, "create", patch.linkedEntityIds);
  }
  if (patch.tags !== undefined) runbook.tags = normalizeTagList(patch.tags);
  runbook.updatedAt = now;

  await writeArgus(data);
  return runbook;
}

export async function softDeleteRunbook(id: string): Promise<void> {
  const data = await readArgus();
  const runbook = data.runbooks.find((entry) => entry.id === id);
  if (!runbook || !isActiveRecord(runbook)) return;
  runbook.deletedAt = new Date().toISOString();
  runbook.updatedAt = runbook.deletedAt;
  await writeArgus(data);
}

export async function getRunbookProgress(
  runbookId: string,
  entityId: string
): Promise<import("./types").RunbookProgress | undefined> {
  const data = await readArgus();
  const id = `${runbookId}::${entityId}`;
  return (data.runbookProgress ?? []).find((row) => row.id === id);
}

export async function upsertRunbookProgress(
  progress: import("./types").RunbookProgress
): Promise<import("./types").RunbookProgress> {
  const data = await readArgus();
  if (!data.runbookProgress) data.runbookProgress = [];
  const idx = data.runbookProgress.findIndex((row) => row.id === progress.id);
  const next = { ...progress, updatedAt: new Date().toISOString() };
  if (idx >= 0) data.runbookProgress[idx] = next;
  else data.runbookProgress.push(next);
  await writeArgus(data);
  return next;
}

export async function copyRunbook(
  sourceId: string,
  linkedEntityIds: string[]
): Promise<Runbook> {
  const source = await getRunbook(sourceId);
  if (!source) throw new Error("Runbook not found");
  const items = source.items.map((item) => ({
    ...item,
    id: `${item.id}_c${Date.now().toString(36)}`,
    done: false,
    doneAt: "",
    subtasks: (item.subtasks ?? []).map((subtask) => ({
      ...subtask,
      id: `${subtask.id}_c${Date.now().toString(36)}`,
      done: false,
      doneAt: "",
    })),
  }));
  return createRunbook({
    title: `${source.title} (copy)`,
    items,
    linkedEntityIds,
    tags: source.tags ?? [],
  });
}

// --- Inbox ---

export async function getInboxItems(
  status?: "pending" | "converted" | "archived",
  includePrivate = false
): Promise<InboxItem[]> {
  let items: InboxItem[];
  if (isCloudInboxStore()) {
    items = await cloudInbox.getInboxItems(status);
  } else {
    const data = await readArgus();
    items = data.inboxItems.filter(isActiveRecord);
    if (status) items = items.filter((i) => i.status === status);
    items = items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }
  return filterPrivateInbox(items, includePrivate);
}

export async function getPendingInboxCount(includePrivate = false): Promise<number> {
  if (isCloudInboxStore()) {
    const items = await getInboxItems("pending", includePrivate);
    return items.length;
  }
  const data = await readArgus();
  const pending = data.inboxItems.filter((i) => isActiveRecord(i) && i.status === "pending");
  return filterPrivateInbox(pending, includePrivate).length;
}

export async function getInboxItem(id: string, includePrivate = false): Promise<InboxItem | undefined> {
  let item: InboxItem | undefined;
  if (isCloudInboxStore()) item = await cloudInbox.getInboxItem(id);
  else {
    const data = await readArgus();
    item = data.inboxItems.find((i) => i.id === id);
  }
  if (!item || !isActiveRecord(item)) return undefined;
  if (!canAccessProtectedRecord(item, includePrivate)) return undefined;
  return item;
}

export async function setInboxPrivate(inboxId: string, isPrivate: boolean): Promise<InboxItem> {
  if (isCloudInboxStore()) return cloudInbox.setInboxPrivate(inboxId, isPrivate);

  const data = await readArgus();
  const idx = data.inboxItems.findIndex((i) => i.id === inboxId);
  if (idx === -1) throw new Error("Inbox item not found");
  data.inboxItems[idx] = { ...data.inboxItems[idx], private: isPrivate };
  await writeArgus(data);
  return data.inboxItems[idx];
}

export async function createInboxItem(
  input: InboxItemInput & { status?: InboxItem["status"]; receivedAt?: string }
): Promise<InboxItem> {
  if (isCloudInboxStore()) return cloudInbox.createInboxItem(input);
  const data = await readArgus();
  const now = new Date().toISOString();
  const item: InboxItem = {
    id: generateId(),
    receivedAt: input.receivedAt ?? now,
    source: input.source,
    rawText: input.rawText,
    rawEmail: input.rawEmail,
    subject: input.subject,
    from: input.from,
    to: input.to,
    attachmentIds: input.attachmentIds ?? [],
    linkedEntityIds: input.linkedEntityIds ?? [],
    private: input.private ?? false,
    status: input.status ?? "pending",
    createdAt: now,
  };
  data.inboxItems.push(item);
  await writeArgus(data);
  return item;
}

export async function linkInboxToEntities(inboxId: string, entityIds: string[]): Promise<InboxItem> {
  if (isCloudInboxStore()) return cloudInbox.linkInboxToEntities(inboxId, entityIds);
  const unique = [...new Set(entityIds.filter(Boolean))];
  if (unique.length === 0) throw new Error("Select at least one reference");

  const data = await readArgus();
  const idx = data.inboxItems.findIndex((i) => i.id === inboxId);
  if (idx === -1) throw new Error("Inbox item not found");
  const inbox = data.inboxItems[idx];
  if (inbox.status === "archived") throw new Error("Inbox item is archived");

  const merged = [...new Set([...(inbox.linkedEntityIds ?? []), ...unique])];
  const now = new Date().toISOString();

  data.inboxItems[idx] = {
    ...inbox,
    linkedEntityIds: merged,
  };

  for (const eid of unique) {
    const entity = data.entities.find((e) => e.id === eid);
    if (entity) entity.updatedAt = now;
  }

  await writeArgus(data);
  return data.inboxItems[idx];
}

/** Replace inbox entity links exactly (supports unlink all). Used by v2 link UI. */
export async function setInboxLinkedEntities(inboxId: string, entityIds: string[]): Promise<InboxItem> {
  if (isCloudInboxStore()) return cloudInbox.setInboxLinkedEntities(inboxId, entityIds);
  const unique = [...new Set(entityIds.filter(Boolean))];

  const data = await readArgus();
  const idx = data.inboxItems.findIndex((i) => i.id === inboxId);
  if (idx === -1) throw new Error("Inbox item not found");
  const inbox = data.inboxItems[idx];
  if (inbox.status === "archived") throw new Error("Inbox item is archived");

  const now = new Date().toISOString();
  const nextStatus = inboxStatusAfterLinkChange(inbox.status, unique.length);
  data.inboxItems[idx] = {
    ...inbox,
    linkedEntityIds: unique,
    ...(nextStatus ? { status: nextStatus } : {}),
  };

  for (const eid of unique) {
    const entity = data.entities.find((e) => e.id === eid);
    if (entity) entity.updatedAt = now;
  }

  await writeArgus(data);
  return data.inboxItems[idx];
}

/** Link inbox email to entities; keep email in inbox (pending/linked, not converted). */
export async function saveInboxEvidenceLinks(
  inboxId: string,
  entityIds: string[]
): Promise<InboxItem> {
  return setInboxLinkedEntities(inboxId, entityIds);
}

export async function archiveInboxItem(id: string): Promise<InboxItem | undefined> {
  if (isCloudInboxStore()) return cloudInbox.archiveInboxItem(id);
  const data = await readArgus();
  const idx = data.inboxItems.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  data.inboxItems[idx] = { ...data.inboxItems[idx], status: "archived" };
  await writeArgus(data);
  return data.inboxItems[idx];
}

export type InboxTriagePatch = {
  status?: InboxItem["status"];
  followUpDate?: string | null;
  topics?: string[];
  subject?: string;
};

function applyEvidenceTopicChange(
  data: ArgusData,
  entityIds: string[],
  prevTopics: string[] | undefined,
  nextTopics: string[] | undefined
) {
  const { added, removed } = diffTagLists(prevTopics, nextTopics);
  if (added.length > 0) mergeEvidenceTagsIntoBinders(data, entityIds, added);
  if (removed.length > 0) pruneBinderTagsMissingEvidence(data, entityIds, removed);
}

export async function updateInboxTriage(inboxId: string, patch: InboxTriagePatch): Promise<InboxItem> {
  if (isCloudInboxStore()) {
    const before = await cloudInbox.getInboxItem(inboxId);
    const updated = await cloudInbox.updateInboxTriage(inboxId, patch);
    if (patch.topics !== undefined && before) {
      const data = await readArgus();
      applyEvidenceTopicChange(
        data,
        updated.linkedEntityIds ?? before.linkedEntityIds ?? [],
        before.topics,
        updated.topics
      );
      await writeArgus(data);
    }
    return updated;
  }

  const data = await readArgus();
  const idx = data.inboxItems.findIndex((i) => i.id === inboxId);
  if (idx === -1) throw new Error("Inbox item not found");
  const inbox = data.inboxItems[idx];
  if (inbox.status === "archived") throw new Error("Inbox item is archived");

  const nextTopics =
    patch.topics !== undefined
      ? [...new Set(patch.topics.map((tag) => tag.trim()).filter(Boolean))]
      : inbox.topics;

  data.inboxItems[idx] = {
    ...inbox,
    status: patch.status ?? inbox.status,
    followUpDate:
      patch.followUpDate === null
        ? undefined
        : patch.followUpDate !== undefined
          ? patch.followUpDate.slice(0, 10)
          : inbox.followUpDate,
    topics: nextTopics,
    subject: patch.subject !== undefined ? patch.subject.trim() || undefined : inbox.subject,
  };
  if (patch.topics !== undefined) {
    applyEvidenceTopicChange(data, inbox.linkedEntityIds ?? [], inbox.topics, nextTopics);
  }
  await writeArgus(data);
  return data.inboxItems[idx];
}

/**
 * @deprecated Prefer Link + Archive (+ Event Note). Still creates a journal note and
 * sets `convertedLogId` so callers can deep-link — never a dead-end graveyard.
 */
export async function convertInboxToLog(
  inboxId: string,
  input: {
    kind: Log["kind"];
    title: string;
    body: string;
    date: string;
    entityIds: string[];
    private: boolean;
    followUpDate?: string;
    topics?: string[];
  }
): Promise<{ log: Log; inbox: InboxItem }> {
  const inbox = isCloudInboxStore()
    ? await cloudInbox.getInboxItem(inboxId)
    : (await readArgus()).inboxItems.find((i) => i.id === inboxId);

  if (!inbox || !isActiveRecord(inbox)) throw new Error("Inbox item not found");
  if (inbox.status !== "pending" && inbox.status !== "linked") {
    throw new Error("Inbox item cannot be converted");
  }

  const entityIds = [...new Set([...(inbox.linkedEntityIds ?? []), ...input.entityIds])];
  const classificationStatus = resolveClassificationStatus(entityIds);
  const now = new Date().toISOString();
  const isPrivate = input.private || Boolean(inbox.private);
  const followUpDate = input.followUpDate ?? inbox.followUpDate;
  const topics = input.topics ?? inbox.topics ?? [];
  const log: Log = {
    id: generateId(),
    kind: input.kind,
    date: input.date,
    title: input.title,
    body: input.body,
    entityIds,
    classificationStatus,
    private: isPrivate,
    source: inbox.source === "email" ? "email" : "inbox",
    attachmentIds: [...inbox.attachmentIds],
    inboxItemId: inbox.id,
    followUpDate,
    topics,
    createdAt: now,
    updatedAt: now,
  };

  const data = await readArgus();
  data.logs.push(log);

  if (isCloudInboxStore()) {
    for (const aid of inbox.attachmentIds) {
      await cloudInbox.reassignAttachmentParent(aid, "journal", log.id);
    }
  } else {
    const idx = data.inboxItems.findIndex((i) => i.id === inboxId);
    for (const aid of inbox.attachmentIds) {
      assignAttachmentParent(data, aid, "journal", log.id);
    }
    data.inboxItems[idx] = {
      ...inbox,
      status: "converted",
      convertedLogId: log.id,
      linkedEntityIds: entityIds,
      private: isPrivate,
    };
  }

  for (const eid of log.entityIds) {
    const entity = data.entities.find((e) => e.id === eid);
    if (entity) entity.updatedAt = now;
  }

  await writeArgus(data);

  const saved = (await readArgus()).logs.find((l) => l.id === log.id && isActiveRecord(l));
  if (!saved) {
    throw new ArgusPersistenceError(
      "database",
      `Converted evidence "${log.title}" was not found after database write confirmation.`
    );
  }

  const updatedInbox = isCloudInboxStore()
    ? await cloudInbox.markInboxConverted(inboxId, saved.id, entityIds, isPrivate)
    : data.inboxItems.find((i) => i.id === inboxId)!;

  return { log: saved, inbox: updatedInbox };
}

export { getArgusDataRoot, getArgusStoragePaths, readStorageMeta } from "./storage";

export async function getStorageDiagnostics(): Promise<{
  root: string;
  external: boolean;
  journalFile: string;
  filesDir: string;
  safety: ReturnType<typeof getStorageSafetyStatus>;
}> {
  await ensureArgusStorageReady();
  const p = getArgusStoragePaths();
  return {
    root: p.root,
    external: isExternalDataRoot(),
    journalFile: p.journalFile,
    filesDir: p.filesDir,
    safety: getStorageSafetyStatus(),
  };
}

export async function searchLogs(query: string, includePrivate: boolean): Promise<Log[]> {
  const q = query.trim().toLowerCase();
  const logs = await getLogs(includePrivate);
  if (!q) return logs;
  return logs.filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      l.body.toLowerCase().includes(q) ||
      l.topics.some((t) => t.toLowerCase().includes(q))
  );
}

function softDeleteAttachmentRecords(data: ArgusData, ids: string[], at: string): void {
  for (const id of ids) {
    const att = data.attachments.find((a) => a.id === id);
    if (att && isActiveRecord(att)) {
      att.deletedAt = at;
    }
  }
}

/** Local JSON clear-all only — never used when Supabase stores are enabled. */
async function removeLocalAttachmentFile(id: string): Promise<void> {
  try {
    await fs.unlink(path.join(paths().filesDir, id));
  } catch {
    /* file may already be missing */
  }
}

export async function deleteLog(id: string): Promise<boolean> {
  const data = await readArgus();
  const idx = data.logs.findIndex((l) => l.id === id);
  if (idx === -1 || !isActiveRecord(data.logs[idx])) return false;

  const now = new Date().toISOString();
  const log = data.logs[idx];
  softDeleteAttachmentRecords(data, log.attachmentIds, now);
  data.logs[idx] = softDeleteLog(log, now);

  await writeArgus(data, "destructive");
  return true;
}

export async function deleteEntity(id: string): Promise<boolean> {
  const data = await readArgus();
  const idx = data.entities.findIndex((e) => e.id === id);
  if (idx === -1 || !isActiveRecord(data.entities[idx])) return false;

  data.entities[idx] = softDeleteEntity(data.entities[idx]);
  await writeArgus(data, "destructive");
  return true;
}

export async function deleteInboxItem(id: string): Promise<boolean> {
  if (isCloudInboxStore()) return cloudInbox.softDeleteInboxItem(id);
  const data = await readArgus();
  const idx = data.inboxItems.findIndex((i) => i.id === id);
  if (idx === -1 || !isActiveRecord(data.inboxItems[idx])) return false;

  const now = new Date().toISOString();
  const item = data.inboxItems[idx];
  softDeleteAttachmentRecords(data, item.attachmentIds, now);
  data.inboxItems[idx] = softDeleteInboxItem(item, now);
  await writeArgus(data, "destructive");
  return true;
}

export async function clearAllArgusData(): Promise<void> {
  if (isSupabaseDestructiveBlocked()) {
    throw new Error(supabaseDestructiveBlockedMessage());
  }
  if (!isDestructiveAllowed()) {
    throw new Error(
      "Clear all ARGUS data is disabled in production. Set ARGUS_ALLOW_DESTRUCTIVE=1 to override."
    );
  }
  await ensureArgusStorageReady();
  const p = paths();
  await fs.mkdir(p.filesDir, { recursive: true });

  const files = await fs.readdir(p.filesDir);
  await Promise.all(files.map((file) => removeLocalAttachmentFile(file)));

  await writeArgus(emptyArgus(), "destructive");
}

/** Replace the journal-level focus Tag watchlist (`signalTags`). */
export async function updateSignalTags(tags: string[]): Promise<string[]> {
  const data = await readArgus();
  data.signalTags = normalizeSignalTags(tags);
  await writeArgus(data);
  return data.signalTags;
}

/** Flag or unflag a Tag as highlight-critical focus. */
export async function toggleSignalTag(tag: string): Promise<{ signalTags: string[]; active: boolean }> {
  const display = tag.trim().replace(/\s+/g, " ");
  if (!display) {
    const data = await readArgus();
    return { signalTags: normalizeSignalTags(data.signalTags), active: false };
  }
  const data = await readArgus();
  const current = normalizeSignalTags(data.signalTags);
  const key = signalTagKey(display);
  const exists = current.some((t) => signalTagKey(t) === key);
  data.signalTags = exists
    ? current.filter((t) => signalTagKey(t) !== key)
    : normalizeSignalTags([...current, display]);
  if (!exists) {
    registerHomeVocabulary(data, [display]);
  }
  await writeArgus(data);
  return { signalTags: data.signalTags ?? [], active: !exists };
}

function pipelineIds() {
  return {
    nowIso: new Date().toISOString(),
    newId: generateId,
  };
}

/** Replace binder Tags and sync Notes + Home vocabulary in one write. */
export async function applyBinderTagPipeline(
  entityId: string,
  nextTags: string[]
): Promise<TagPipelineResult> {
  const data = await readArgus();
  const result = applyBinderTagSync(data, entityId, nextTags, pipelineIds());
  await writeArgus(data);
  return result;
}

/** Merge Tags onto binder + Notes + Home vocabulary (create path). */
export async function ensureTagsInPipeline(
  entityId: string,
  tags: string[]
): Promise<TagPipelineResult> {
  const data = await readArgus();
  const result = ensureTagsInPipelineSync(data, entityId, tags, pipelineIds());
  await writeArgus(data);
  return result;
}

/** Rename a tag string. Pass `role` to limit scope (ORDER 001); omit = all tag surfaces. */
export async function renameTagGlobally(
  oldTag: string,
  newTag: string,
  role?: import("./tag-ontology").TagRole
): Promise<number> {
  const oldKey = oldTag.trim().toLowerCase();
  const newDisplay = newTag.trim().replace(/\s+/g, " ");
  if (!oldKey || !newDisplay) return 0;

  const data = await readArgus();
  let touched = 0;

  /** Case-aware rewrite + dedupe (normalizeTagList) so Bar→foo merges with existing Foo. */
  const renameInList = (list: string[] | undefined): string[] | undefined => {
    if (!list?.length) return list;
    let changed = false;
    const mapped = list.map((tag) => {
      if (tag.trim().toLowerCase() !== oldKey) return tag;
      changed = true;
      return newDisplay;
    });
    if (!changed) return list;
    return normalizeTagList(mapped);
  };

  const touchEvidence = !role || role === "evidence";
  const touchGlobal = !role || role === "global";
  const touchProject = !role || role === "project";
  const touchTopic = !role || role === "topic";
  const touchEvent = !role || role === "event";
  // Trackers follow evidence/global renames when unscoped or evidence/global
  const touchTrackers = !role || role === "evidence" || role === "global";

  if (touchTrackers) {
    const signalTags = data.signalTags ?? [];
    if (signalTags.some((t) => t.trim().toLowerCase() === oldKey)) {
      data.signalTags = normalizeSignalTags(
        signalTags.map((t) => (t.trim().toLowerCase() === oldKey ? newDisplay : t))
      );
      touched += 1;
    }
  }

  if (touchGlobal) {
    const next = renameInList(data.globalTags);
    if (next && next !== data.globalTags) {
      data.globalTags = next;
      touched += 1;
    }
  }

  if (touchEvidence) {
    for (let i = 0; i < data.logs.length; i++) {
      const log = data.logs[i];
      const topics = log.topics ?? [];
      let changed = false;
      const next = topics.map((tag) => {
        if (tag.trim().toLowerCase() !== oldKey) return tag;
        changed = true;
        return newDisplay;
      });
      if (changed) {
        data.logs[i] = { ...log, topics: normalizeTagList(next) };
        touched += 1;
      }
    }

    for (let i = 0; i < data.inboxItems.length; i++) {
      const item = data.inboxItems[i];
      const topics = item.topics ?? [];
      if (topics.length === 0) continue;
      let changed = false;
      const next = topics.map((tag) => {
        if (tag.trim().toLowerCase() !== oldKey) return tag;
        changed = true;
        return newDisplay;
      });
      if (changed) {
        data.inboxItems[i] = { ...item, topics: normalizeTagList(next) };
        touched += 1;
      }
    }
  }

  for (let i = 0; i < data.entities.length; i++) {
    const entity = data.entities[i];
    if (entity.deletedAt) continue;
    let patch: Partial<(typeof data.entities)[0]> | null = null;
    const kind = referenceKindFromNotes(entity.notes ?? "");

    if (touchTopic && kind === "topic") {
      const topicTags = renameInList(entity.topicTags);
      const linkedTags = renameInList(entity.linkedTags);
      if (topicTags !== entity.topicTags || linkedTags !== entity.linkedTags) {
        patch = {
          ...(patch ?? {}),
          topicTags: topicTags ?? entity.topicTags,
          linkedTags: linkedTags ?? entity.linkedTags,
        };
      }
    }
    if (touchProject && entity.type === "project") {
      const projectTags = renameInList(entity.projectTags);
      const linkedTags = renameInList(entity.linkedTags);
      if (projectTags !== entity.projectTags || linkedTags !== entity.linkedTags) {
        patch = {
          ...(patch ?? {}),
          projectTags: projectTags ?? entity.projectTags,
          linkedTags: linkedTags ?? entity.linkedTags,
        };
      }
    }
    if (touchEvent && kind === "event") {
      const eventTags = renameInList(entity.eventTags);
      if (eventTags !== entity.eventTags) {
        patch = { ...(patch ?? {}), eventTags: eventTags ?? entity.eventTags };
      }
    }

    if (patch) {
      data.entities[i] = { ...entity, ...patch };
      touched += 1;
    }
  }

  // Runbook classification tags (promoted from checks) — same string vocabulary.
  if (!role || role === "global" || role === "evidence") {
    for (let i = 0; i < (data.runbooks ?? []).length; i++) {
      const runbook = data.runbooks[i];
      if (!runbook || runbook.deletedAt) continue;
      const next = renameInList(runbook.tags);
      if (next && next !== runbook.tags) {
        data.runbooks[i] = { ...runbook, tags: next };
        touched += 1;
      }
    }
  }

  if (touched > 0) await writeArgus(data);
  return touched;
}

/**
 * Remove a tag string everywhere (Notes, inbox, binders, Trackers, global, runbooks).
 * Does not delete Notes — only strips the Tag membership.
 */
export async function deleteTagGlobally(tag: string): Promise<number> {
  const key = tag.trim().toLowerCase();
  if (!key) return 0;

  const data = await readArgus();
  let touched = 0;

  const removeFromList = (list: string[] | undefined): string[] | undefined => {
    if (!list?.length) return list;
    const next = list.filter((t) => t.trim().toLowerCase() !== key);
    if (next.length === list.length) return list;
    return normalizeTagList(next);
  };

  const signalTags = data.signalTags ?? [];
  if (signalTags.some((t) => t.trim().toLowerCase() === key)) {
    data.signalTags = normalizeSignalTags(signalTags.filter((t) => t.trim().toLowerCase() !== key));
    touched += 1;
  }

  const nextGlobal = removeFromList(data.globalTags);
  if (nextGlobal && nextGlobal !== data.globalTags) {
    data.globalTags = nextGlobal;
    touched += 1;
  }

  for (let i = 0; i < data.logs.length; i++) {
    const log = data.logs[i];
    const topics = log.topics ?? [];
    if (!topics.some((t) => t.trim().toLowerCase() === key)) continue;
    data.logs[i] = {
      ...log,
      topics: normalizeTagList(topics.filter((t) => t.trim().toLowerCase() !== key)),
    };
    touched += 1;
  }

  for (let i = 0; i < data.inboxItems.length; i++) {
    const item = data.inboxItems[i];
    const topics = item.topics ?? [];
    if (!topics.some((t) => t.trim().toLowerCase() === key)) continue;
    data.inboxItems[i] = {
      ...item,
      topics: normalizeTagList(topics.filter((t) => t.trim().toLowerCase() !== key)),
    };
    touched += 1;
  }

  for (let i = 0; i < data.entities.length; i++) {
    const entity = data.entities[i];
    if (entity.deletedAt) continue;
    let patch: Partial<(typeof data.entities)[0]> | null = null;
    const kind = referenceKindFromNotes(entity.notes ?? "");

    if (kind === "topic") {
      const topicTags = removeFromList(entity.topicTags);
      const linkedTags = removeFromList(entity.linkedTags);
      if (topicTags !== entity.topicTags || linkedTags !== entity.linkedTags) {
        patch = {
          ...(patch ?? {}),
          topicTags: topicTags ?? [],
          linkedTags: linkedTags ?? [],
        };
      }
    }
    if (entity.type === "project") {
      const projectTags = removeFromList(entity.projectTags);
      const linkedTags = removeFromList(entity.linkedTags);
      if (projectTags !== entity.projectTags || linkedTags !== entity.linkedTags) {
        patch = {
          ...(patch ?? {}),
          projectTags: projectTags ?? [],
          linkedTags: linkedTags ?? [],
        };
      }
    }
    if (kind === "event") {
      const eventTags = removeFromList(entity.eventTags);
      if (eventTags !== entity.eventTags) {
        patch = { ...(patch ?? {}), eventTags: eventTags ?? [] };
      }
    }

    if (patch) {
      data.entities[i] = { ...entity, ...patch };
      touched += 1;
    }
  }

  for (let i = 0; i < (data.runbooks ?? []).length; i++) {
    const runbook = data.runbooks[i];
    if (!runbook || runbook.deletedAt) continue;
    const next = removeFromList(runbook.tags);
    if (next && next !== runbook.tags) {
      data.runbooks[i] = { ...runbook, tags: next };
      touched += 1;
    }
  }

  if (touched > 0) await writeArgus(data);
  return touched;
}

/** Add a Tag to the durable global vocabulary (Home Tags manager Create). */
export async function createGlobalTag(tag: string): Promise<{ tag: string; created: boolean }> {
  const display = normalizeTagDisplay(tag);
  if (!display) {
    throw new ArgusPersistenceError("validation", "Tag is required.");
  }
  const data = await readArgus();
  const key = tagKey(display);
  const existing = normalizeTagList(data.globalTags);
  const found = existing.find((t) => tagKey(t) === key);
  if (found) {
    return { tag: found, created: false };
  }
  data.globalTags = normalizeTagList([...existing, display]);
  await writeArgus(data);
  return { tag: display, created: true };
}

export { ArgusWriteBlockedError } from "./data-safety";
export { getStorageSafetyStatus };
