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
} from "./types";
import { resolveClassificationStatus } from "./normalize";
import { ArgusPersistenceError } from "./persistence/errors";
import { isActiveRecord, softDeleteEntity, softDeleteLog, softDeleteInboxItem } from "./supabase-protection/protected-counts";
import {
  isSupabaseDestructiveBlocked,
  supabaseDestructiveBlockedMessage,
} from "./supabase-protection/policy";
import { isCloudInboxStore } from "./inbox-store/config";
import * as cloudInbox from "./inbox-store/supabase";
import { isCloudJournalStore } from "./journal-store/config";
import * as cloudJournal from "./journal-store/supabase";
import * as cloudJournalFiles from "./journal-store/attachments";

function paths() {
  return getArgusStoragePaths();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyArgus(): ArgusData {
  return { entities: [], logs: [], inboxItems: [], attachments: [], version: 3 };
}

async function ensureFilesDir(): Promise<void> {
  await ensureArgusStorageReady();
  await fs.mkdir(paths().filesDir, { recursive: true });
}

async function readRawJournal(): Promise<ArgusData> {
  if (isCloudJournalStore()) {
    const cloud = await cloudJournal.readJournalFromSupabase();
    if (cloud) return cloud;

    await ensureArgusStorageReady();
    const p = paths();
    try {
      const raw = await fs.readFile(p.journalFile, "utf-8");
      const migrated = migrateToV3(JSON.parse(raw));
      await writeArgus(migrated, "bootstrap");
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
    const raw = await fs.readFile(p.journalFile, "utf-8");
    return migrateToV3(JSON.parse(raw));
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

function filterPrivateLogs(logs: Log[], includePrivate: boolean): Log[] {
  const active = logs.filter(isActiveRecord);
  if (includePrivate) return active;
  return active.filter((l) => !l.private);
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
    linkedPersonIds: input.linkedPersonIds ?? [],
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
    "strategicValue" | "alias" | "notes" | "name" | "startDate" | "endDate" | "linkedPersonIds" | "linkedTags"
  >
>;

function normalizeOptionalDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim().slice(0, 10);
  return trimmed || undefined;
}

function normalizeLinkedPersonIds(data: ArgusData, ids: string[] | undefined): string[] {
  if (!ids?.length) return [];
  const valid = new Set(
    data.entities.filter(isActiveRecord).filter((e) => e.type === "person" || e.type === "company").map((e) => e.id)
  );
  return [...new Set(ids.filter((id) => valid.has(id)))];
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

  data.entities[idx] = {
    ...current,
    name: name || current.name,
    strategicValue,
    alias: patch.alias ?? current.alias ?? "",
    notes: patch.notes ?? current.notes ?? "",
    startDate: patch.startDate !== undefined ? normalizeOptionalDate(patch.startDate) : current.startDate,
    endDate: patch.endDate !== undefined ? normalizeOptionalDate(patch.endDate) : current.endDate,
    linkedPersonIds:
      patch.linkedPersonIds !== undefined
        ? normalizeLinkedPersonIds(data, patch.linkedPersonIds)
        : current.linkedPersonIds ?? [],
    linkedTags:
      patch.linkedTags !== undefined ? normalizeLinkedTags(patch.linkedTags) : current.linkedTags ?? [],
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
  return filterPrivateLogs(data.logs, includePrivate).sort((a, b) => b.date.localeCompare(a.date));
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
  }
): Promise<Log> {
  const data = await readArgus();
  const log = data.logs.find((l) => l.id === id);
  if (!log) throw new Error("Journal entry not found");

  const now = new Date().toISOString();
  log.title = input.title.trim() || log.title;
  log.body = input.body;
  log.kind = input.kind;
  log.date = input.date;
  log.followUpDate = input.followUpDate;
  log.entityIds = input.entityIds;
  log.topics = input.topics;
  log.classificationStatus = resolveClassificationStatus(input.entityIds);
  log.updatedAt = now;

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

// --- Inbox ---

export async function getInboxItems(status?: "pending" | "converted" | "archived"): Promise<InboxItem[]> {
  if (isCloudInboxStore()) return cloudInbox.getInboxItems(status);
  const data = await readArgus();
  let items = data.inboxItems.filter(isActiveRecord);
  if (status) items = items.filter((i) => i.status === status);
  return items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export async function getPendingInboxCount(): Promise<number> {
  if (isCloudInboxStore()) return cloudInbox.getPendingInboxCount();
  const data = await readArgus();
  return data.inboxItems.filter((i) => isActiveRecord(i) && i.status === "pending").length;
}

export async function getInboxItem(id: string): Promise<InboxItem | undefined> {
  if (isCloudInboxStore()) return cloudInbox.getInboxItem(id);
  const data = await readArgus();
  const item = data.inboxItems.find((i) => i.id === id);
  if (!item || !isActiveRecord(item)) return undefined;
  return item;
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
    status: inbox.status === "converted" ? "converted" : "linked",
  };

  for (const eid of unique) {
    const entity = data.entities.find((e) => e.id === eid);
    if (entity) entity.updatedAt = now;
  }

  await writeArgus(data);
  return data.inboxItems[idx];
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
  const log: Log = {
    id: generateId(),
    kind: input.kind,
    date: input.date,
    title: input.title,
    body: input.body,
    entityIds,
    classificationStatus,
    private: input.private,
    source: inbox.source === "email" ? "email" : "inbox",
    attachmentIds: [...inbox.attachmentIds],
    inboxItemId: inbox.id,
    followUpDate: input.followUpDate,
    topics: input.topics ?? [],
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
    ? await cloudInbox.markInboxConverted(inboxId, saved.id, entityIds)
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

export { ArgusWriteBlockedError } from "./data-safety";
export { getStorageSafetyStatus };
