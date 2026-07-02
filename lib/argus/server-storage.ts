import { promises as fs } from "fs";
import path from "path";
import { migrateToArgusData } from "./migrate";
import type {
  ArgusData,
  ArgusStats,
  Contact,
  ContactInput,
  Entry,
  EntryInput,
  Evidence,
  EvidenceInput,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "argus");
const LEGACY_DATA_DIR = path.join(process.cwd(), "data", "health-vault");
const JOURNAL_FILE = path.join(DATA_DIR, "journal.json");
const LEGACY_VAULT_FILE = path.join(LEGACY_DATA_DIR, "vault.json");
const FILES_DIR = path.join(DATA_DIR, "files");
const LEGACY_FILES_DIR = path.join(LEGACY_DATA_DIR, "files");

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyArgus(): ArgusData {
  return { contacts: [], entries: [], evidence: [], version: 2 };
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

async function migrateLegacyFiles(): Promise<void> {
  try {
    await fs.access(LEGACY_FILES_DIR);
  } catch {
    return;
  }
  await ensureDirs();
  const names = await fs.readdir(LEGACY_FILES_DIR);
  for (const name of names) {
    const src = path.join(LEGACY_FILES_DIR, name);
    const dest = path.join(FILES_DIR, name);
    try {
      await fs.access(dest);
    } catch {
      await fs.copyFile(src, dest);
    }
  }
}

async function readRawJournal(): Promise<ArgusData> {
  try {
    const raw = await fs.readFile(JOURNAL_FILE, "utf-8");
    return migrateToArgusData(JSON.parse(raw));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }

  try {
    const raw = await fs.readFile(LEGACY_VAULT_FILE, "utf-8");
    const migrated = migrateToArgusData(JSON.parse(raw));
    await migrateLegacyFiles();
    await writeArgus(migrated);
    return migrated;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyArgus();
    throw err;
  }
}

async function writeArgus(data: ArgusData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${JOURNAL_FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, JOURNAL_FILE);
}

function filterEntries(entries: Entry[], includePrivate: boolean): Entry[] {
  if (includePrivate) return entries;
  return entries.filter((e) => !e.private);
}

export async function readArgus(): Promise<ArgusData> {
  return readRawJournal();
}

export async function getContacts(): Promise<Contact[]> {
  const data = await readArgus();
  return data.contacts.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const data = await readArgus();
  return data.contacts.find((c) => c.id === id);
}

export async function createContact(input: ContactInput): Promise<Contact> {
  const data = await readArgus();
  const contact: Contact = { ...input, id: generateId(), createdAt: new Date().toISOString() };
  data.contacts.push(contact);
  await writeArgus(data);
  return contact;
}

export async function getEntries(includePrivate: boolean): Promise<Entry[]> {
  const data = await readArgus();
  return filterEntries(data.entries, includePrivate).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getEntry(id: string, includePrivate: boolean): Promise<Entry | undefined> {
  const data = await readArgus();
  const entry = data.entries.find((e) => e.id === id);
  if (!entry) return undefined;
  if (entry.private && !includePrivate) return undefined;
  return entry;
}

export async function createEntry(input: EntryInput): Promise<Entry> {
  const data = await readArgus();
  const now = new Date().toISOString();
  const entry: Entry = {
    ...input,
    private: input.private ?? false,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  data.entries.push(entry);
  await writeArgus(data);
  return entry;
}

export async function getEvidence(entryId: string | undefined, includePrivate: boolean): Promise<Evidence[]> {
  const data = await readArgus();
  const privateEntryIds = new Set(data.entries.filter((e) => e.private).map((e) => e.id));
  let items = data.evidence;
  if (entryId) items = items.filter((e) => e.entryId === entryId);
  if (!includePrivate) items = items.filter((e) => !privateEntryIds.has(e.entryId));
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export async function createEvidence(input: EvidenceInput): Promise<Evidence> {
  const data = await readArgus();
  const item: Evidence = { ...input, id: generateId(), createdAt: new Date().toISOString() };
  data.evidence.push(item);
  await writeArgus(data);
  return item;
}

export async function saveEvidenceAttachment(
  evidenceId: string,
  fileName: string,
  mime: string,
  bytes: Buffer
): Promise<void> {
  await ensureDirs();
  const data = await readArgus();
  const idx = data.evidence.findIndex((e) => e.id === evidenceId);
  if (idx === -1) throw new Error("Evidence not found");
  const safeName = fileName.replace(/[^\w.\-() ]/g, "_").slice(0, 120);
  await fs.writeFile(path.join(FILES_DIR, evidenceId), bytes);
  data.evidence[idx] = {
    ...data.evidence[idx],
    attachmentName: safeName,
    attachmentMime: mime,
  };
  await writeArgus(data);
}

export async function readEvidenceAttachment(evidenceId: string): Promise<Buffer | null> {
  const primary = path.join(FILES_DIR, evidenceId);
  try {
    return await fs.readFile(primary);
  } catch {
    try {
      return await fs.readFile(path.join(LEGACY_FILES_DIR, evidenceId));
    } catch {
      return null;
    }
  }
}

export async function getEntriesForContact(contactId: string, includePrivate: boolean): Promise<Entry[]> {
  const entries = await getEntries(includePrivate);
  return entries.filter((e) => e.contactIds.includes(contactId));
}

export async function getStats(includePrivate: boolean): Promise<ArgusStats> {
  const data = await readArgus();
  const visible = filterEntries(data.entries, includePrivate);
  const privateIds = new Set(data.entries.filter((e) => e.private).map((e) => e.id));
  const visibleEvidence = includePrivate
    ? data.evidence
    : data.evidence.filter((e) => !privateIds.has(e.entryId));

  return {
    totalEntries: visible.length,
    totalEvidence: visibleEvidence.length,
    totalContacts: data.contacts.length,
    openEntries: visible.filter((e) => e.status === "open" || e.status === "follow_up").length,
    privateEntries: data.entries.filter((e) => e.private).length,
  };
}

export function evidenceCountForEntry(data: ArgusData, entryId: string): number {
  return data.evidence.filter((e) => e.entryId === entryId).length;
}

export async function loadArgusWithCounts(includePrivate: boolean): Promise<{
  stats: ArgusStats;
  recentEntries: Entry[];
  recentEvidence: Evidence[];
  evidenceCounts: Map<string, number>;
}> {
  const data = await readArgus();
  const stats = await getStats(includePrivate);
  const recentEntries = filterEntries(data.entries, includePrivate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const privateIds = new Set(data.entries.filter((e) => e.private).map((e) => e.id));
  const recentEvidence = data.evidence
    .filter((e) => includePrivate || !privateIds.has(e.entryId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const counts = new Map<string, number>();
  for (const e of filterEntries(data.entries, includePrivate)) {
    counts.set(e.id, evidenceCountForEntry(data, e.id));
  }
  return { stats, recentEntries, recentEvidence, evidenceCounts: counts };
}
