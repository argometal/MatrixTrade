import { SEED_EVIDENCE, SEED_PEOPLE, SEED_RECORDS } from "./seed";
import type {
  Evidence,
  EvidenceInput,
  Person,
  PersonInput,
  RecordInput,
  VaultData,
  WorkRecord,
} from "./types";

const STORAGE_KEY = "health-vault-data";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function seedData(): VaultData {
  return { people: SEED_PEOPLE, records: SEED_RECORDS, evidence: SEED_EVIDENCE, seeded: true };
}

export function loadData(): VaultData {
  if (typeof window === "undefined") return seedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    return JSON.parse(raw) as VaultData;
  } catch {
    return { people: [], records: [], evidence: [], seeded: false };
  }
}

function saveData(data: VaultData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getPeople(): Person[] {
  return loadData().people.sort((a, b) => a.name.localeCompare(b.name));
}

export function getPerson(id: string): Person | undefined {
  return loadData().people.find((p) => p.id === id);
}

export function createPerson(input: PersonInput): Person {
  const data = loadData();
  const person: Person = { ...input, id: generateId(), createdAt: new Date().toISOString() };
  data.people.push(person);
  saveData(data);
  return person;
}

export function updatePerson(id: string, input: Partial<PersonInput>): Person | undefined {
  const data = loadData();
  const index = data.people.findIndex((p) => p.id === id);
  if (index === -1) return undefined;
  data.people[index] = { ...data.people[index], ...input };
  saveData(data);
  return data.people[index];
}

export function getRecords(): WorkRecord[] {
  return loadData().records.sort((a, b) => b.date.localeCompare(a.date));
}

export function getRecord(id: string): WorkRecord | undefined {
  return loadData().records.find((r) => r.id === id);
}

export function createRecord(input: RecordInput): WorkRecord {
  const data = loadData();
  const now = new Date().toISOString();
  const record: WorkRecord = { ...input, id: generateId(), createdAt: now, updatedAt: now };
  data.records.push(record);
  saveData(data);
  return record;
}

export function updateRecord(id: string, input: Partial<RecordInput>): WorkRecord | undefined {
  const data = loadData();
  const index = data.records.findIndex((r) => r.id === id);
  if (index === -1) return undefined;
  data.records[index] = { ...data.records[index], ...input, updatedAt: new Date().toISOString() };
  saveData(data);
  return data.records[index];
}

export function getEvidence(recordId?: string): Evidence[] {
  const items = loadData().evidence;
  const filtered = recordId ? items.filter((e) => e.recordId === recordId) : items;
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

export function createEvidence(input: EvidenceInput): Evidence {
  const data = loadData();
  const item: Evidence = { ...input, id: generateId(), createdAt: new Date().toISOString() };
  data.evidence.push(item);
  saveData(data);
  return item;
}

export function searchRecords(query: string): WorkRecord[] {
  const q = query.toLowerCase().trim();
  if (!q) return getRecords();
  return getRecords().filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function searchPeople(query: string): Person[] {
  const q = query.toLowerCase().trim();
  if (!q) return getPeople();
  return getPeople().filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.relationship.toLowerCase().includes(q)
  );
}

export function getRecordsForPerson(personId: string): WorkRecord[] {
  return getRecords().filter((r) => r.personIds.includes(personId));
}

export function getStats() {
  const data = loadData();
  return {
    totalRecords: data.records.length,
    totalEvidence: data.evidence.length,
    totalPeople: data.people.length,
    openRecords: data.records.filter((r) => r.status === "abierto").length,
  };
}

export function getRecentRecords(limit = 5): WorkRecord[] {
  return getRecords().slice(0, limit);
}

export function getRecentEvidence(limit = 5): Evidence[] {
  return getEvidence().slice(0, limit);
}
