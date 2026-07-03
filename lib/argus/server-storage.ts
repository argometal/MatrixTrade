import { promises as fs } from "fs";
import path from "path";
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
    await writeArgus(migrated);
    return migrated;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyArgus();
    throw err;
  }
}

async function writeArgus(data: ArgusData): Promise<void> {
  await ensureArgusStorageReady();
  const p = paths();
  await fs.mkdir(p.root, { recursive: true });
  const tmp = `${p.journalFile}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, p.journalFile);
}

function filterPrivateLogs(logs: Log[], includePrivate: boolean): Log[] {
  if (includePrivate) return logs;
  return logs.filter((l) => !l.private);
}

export async function readArgus(): Promise<ArgusData> {
  return readRawJournal();
}

// --- Entities ---

export async function getEntities(): Promise<Entity[]> {
  const data = await readArgus();
  return data.entities.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEntity(id: string): Promise<Entity | undefined> {
  const data = await readArgus();
  return data.entities.find((e) => e.id === id);
}

export async function searchEntities(query: string): Promise<Entity[]> {
  const q = query.trim().toLowerCase();
  if (!q) return getEntities();
  const data = await readArgus();
  return data.entities
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
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  data.entities.push(entity);
  await writeArgus(data);
  return entity;
}

export async function updateEntity(
  id: string,
  patch: Pick<Entity, "strategicValue" | "alias" | "notes">
): Promise<Entity | undefined> {
  const data = await readArgus();
  const idx = data.entities.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;

  const sv = patch.strategicValue;
  const strategicValue = sv >= 1 && sv <= 5 ? sv : data.entities[idx].strategicValue;

  data.entities[idx] = {
    ...data.entities[idx],
    strategicValue,
    alias: patch.alias ?? "",
    notes: patch.notes ?? "",
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
  await ensureFilesDir();
  const data = await readArgus();
  const id = generateId();
  const safeName = fileName.replace(/[^\w.\-() ]/g, "_").slice(0, 120);
  await fs.writeFile(path.join(paths().filesDir, id), bytes);
  const attachment: Attachment = {
    id,
    fileName: safeName,
    mimeType: mimeType || "application/octet-stream",
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
  try {
    return await fs.readFile(path.join(paths().filesDir, id));
  } catch {
    return null;
  }
}

export async function getAttachment(id: string): Promise<Attachment | undefined> {
  const data = await readArgus();
  return data.attachments.find((a) => a.id === id);
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
  if (!log) return undefined;
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
  await writeArgus(data);
  return log;
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
  const data = await readArgus();
  let items = data.inboxItems;
  if (status) items = items.filter((i) => i.status === status);
  return items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export async function getPendingInboxCount(): Promise<number> {
  const data = await readArgus();
  return data.inboxItems.filter((i) => i.status === "pending").length;
}

export async function getInboxItem(id: string): Promise<InboxItem | undefined> {
  const data = await readArgus();
  return data.inboxItems.find((i) => i.id === id);
}

export async function createInboxItem(
  input: InboxItemInput & { status?: InboxItem["status"]; receivedAt?: string }
): Promise<InboxItem> {
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
    status: input.status ?? "pending",
    createdAt: now,
  };
  data.inboxItems.push(item);
  await writeArgus(data);
  return item;
}

export async function archiveInboxItem(id: string): Promise<InboxItem | undefined> {
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
  const data = await readArgus();
  const idx = data.inboxItems.findIndex((i) => i.id === inboxId);
  if (idx === -1) throw new Error("Inbox item not found");
  const inbox = data.inboxItems[idx];
  if (inbox.status !== "pending") throw new Error("Inbox item is not pending");

  const classificationStatus = resolveClassificationStatus(input.entityIds);
  const now = new Date().toISOString();
  const log: Log = {
    id: generateId(),
    kind: input.kind,
    date: input.date,
    title: input.title,
    body: input.body,
    entityIds: input.entityIds,
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
  data.logs.push(log);

  for (const aid of inbox.attachmentIds) {
    assignAttachmentParent(data, aid, "journal", log.id);
  }

  data.inboxItems[idx] = {
    ...inbox,
    status: "converted",
    convertedLogId: log.id,
  };

  for (const eid of log.entityIds) {
    const entity = data.entities.find((e) => e.id === eid);
    if (entity) entity.updatedAt = now;
  }

  await writeArgus(data);
  return { log, inbox: data.inboxItems[idx] };
}

export { getArgusDataRoot, getArgusStoragePaths, readStorageMeta } from "./storage";

export async function getStorageDiagnostics(): Promise<{
  root: string;
  external: boolean;
  journalFile: string;
  filesDir: string;
}> {
  await ensureArgusStorageReady();
  const p = getArgusStoragePaths();
  return {
    root: p.root,
    external: isExternalDataRoot(),
    journalFile: p.journalFile,
    filesDir: p.filesDir,
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
