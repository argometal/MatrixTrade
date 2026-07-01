import { promises as fs } from "fs";
import path from "path";
import type {
  Evidence,
  EvidenceInput,
  Person,
  PersonInput,
  RecordInput,
  VaultData,
  VaultStats,
  WorkRecord,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "health-vault");
const VAULT_FILE = path.join(DATA_DIR, "vault.json");
const FILES_DIR = path.join(DATA_DIR, "files");

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyVault(): VaultData {
  return { people: [], records: [], evidence: [], version: 1 };
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

export async function readVault(): Promise<VaultData> {
  try {
    const raw = await fs.readFile(VAULT_FILE, "utf-8");
    const parsed = JSON.parse(raw) as VaultData;
    return {
      ...emptyVault(),
      ...parsed,
      people: parsed.people ?? [],
      records: (parsed.records ?? []).map((r) => ({ ...r, secret: r.secret ?? false })),
      evidence: parsed.evidence ?? [],
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyVault();
    throw err;
  }
}

async function writeVault(data: VaultData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${VAULT_FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, VAULT_FILE);
}

function filterRecords(records: WorkRecord[], includeSecret: boolean): WorkRecord[] {
  if (includeSecret) return records;
  return records.filter((r) => !r.secret);
}

export async function getPeople(): Promise<Person[]> {
  const data = await readVault();
  return data.people.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPerson(id: string): Promise<Person | undefined> {
  const data = await readVault();
  return data.people.find((p) => p.id === id);
}

export async function createPerson(input: PersonInput): Promise<Person> {
  const data = await readVault();
  const person: Person = { ...input, id: generateId(), createdAt: new Date().toISOString() };
  data.people.push(person);
  await writeVault(data);
  return person;
}

export async function getRecords(includeSecret: boolean): Promise<WorkRecord[]> {
  const data = await readVault();
  return filterRecords(data.records, includeSecret).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getRecord(id: string, includeSecret: boolean): Promise<WorkRecord | undefined> {
  const data = await readVault();
  const record = data.records.find((r) => r.id === id);
  if (!record) return undefined;
  if (record.secret && !includeSecret) return undefined;
  return record;
}

export async function createRecord(input: RecordInput): Promise<WorkRecord> {
  const data = await readVault();
  const now = new Date().toISOString();
  const record: WorkRecord = {
    ...input,
    secret: input.secret ?? false,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  data.records.push(record);
  await writeVault(data);
  return record;
}

export async function getEvidence(recordId: string | undefined, includeSecret: boolean): Promise<Evidence[]> {
  const data = await readVault();
  const secretRecordIds = new Set(data.records.filter((r) => r.secret).map((r) => r.id));
  let items = data.evidence;
  if (recordId) items = items.filter((e) => e.recordId === recordId);
  if (!includeSecret) items = items.filter((e) => !secretRecordIds.has(e.recordId));
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export async function createEvidence(input: EvidenceInput): Promise<Evidence> {
  const data = await readVault();
  const item: Evidence = { ...input, id: generateId(), createdAt: new Date().toISOString() };
  data.evidence.push(item);
  await writeVault(data);
  return item;
}

export async function saveEvidenceAttachment(
  evidenceId: string,
  fileName: string,
  mime: string,
  bytes: Buffer
): Promise<void> {
  await ensureDirs();
  const data = await readVault();
  const idx = data.evidence.findIndex((e) => e.id === evidenceId);
  if (idx === -1) throw new Error("Evidence not found");
  const safeName = fileName.replace(/[^\w.\-() ]/g, "_").slice(0, 120);
  await fs.writeFile(path.join(FILES_DIR, evidenceId), bytes);
  data.evidence[idx] = {
    ...data.evidence[idx],
    attachmentName: safeName,
    attachmentMime: mime,
  };
  await writeVault(data);
}

export async function readEvidenceAttachment(evidenceId: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(FILES_DIR, evidenceId));
  } catch {
    return null;
  }
}

export async function getRecordsForPerson(personId: string, includeSecret: boolean): Promise<WorkRecord[]> {
  const records = await getRecords(includeSecret);
  return records.filter((r) => r.personIds.includes(personId));
}

export async function getStats(includeSecret: boolean): Promise<VaultStats> {
  const data = await readVault();
  const visible = filterRecords(data.records, includeSecret);
  const secretIds = new Set(data.records.filter((r) => r.secret).map((r) => r.id));
  const visibleEvidence = includeSecret
    ? data.evidence
    : data.evidence.filter((e) => !secretIds.has(e.recordId));

  return {
    totalRecords: visible.length,
    totalEvidence: visibleEvidence.length,
    totalPeople: data.people.length,
    openRecords: visible.filter((r) => r.status === "abierto").length,
    secretRecords: data.records.filter((r) => r.secret).length,
  };
}

export async function getRecentRecords(limit: number, includeSecret: boolean): Promise<WorkRecord[]> {
  return (await getRecords(includeSecret)).slice(0, limit);
}

export async function getRecentEvidence(limit: number, includeSecret: boolean): Promise<Evidence[]> {
  return (await getEvidence(undefined, includeSecret)).slice(0, limit);
}

export function evidenceCountForRecord(data: VaultData, recordId: string): number {
  return data.evidence.filter((e) => e.recordId === recordId).length;
}

export async function loadVaultWithCounts(includeSecret: boolean): Promise<{
  stats: VaultStats;
  recentRecords: WorkRecord[];
  recentEvidence: Evidence[];
  evidenceCounts: Map<string, number>;
}> {
  const data = await readVault();
  const stats = await getStats(includeSecret);
  const recentRecords = filterRecords(data.records, includeSecret)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const secretIds = new Set(data.records.filter((r) => r.secret).map((r) => r.id));
  const recentEvidence = data.evidence
    .filter((e) => includeSecret || !secretIds.has(e.recordId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const counts = new Map<string, number>();
  for (const r of filterRecords(data.records, includeSecret)) {
    counts.set(r.id, evidenceCountForRecord(data, r.id));
  }
  return { stats, recentRecords, recentEvidence, evidenceCounts: counts };
}
