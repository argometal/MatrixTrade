import type { ArgusData, Entity, Log, LogSource } from "./types";
import { normalizeArgusData, normalizeLog } from "./normalize";

interface LegacyContact {
  id: string;
  name: string;
  role?: string;
  department?: string;
  relationship?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt?: string;
}

interface LegacyEntry {
  id: string;
  title: string;
  date: string;
  description: string;
  contactIds?: string[];
  private?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface LegacyEvidence {
  id: string;
  entryId?: string;
  title: string;
  date: string;
  content: string;
  source?: string;
  attachmentName?: string;
  attachmentMime?: string;
  createdAt?: string;
}

interface LegacyV2 {
  version?: number;
  contacts?: LegacyContact[];
  entries?: LegacyEntry[];
  evidence?: LegacyEvidence[];
}

function mapEvidenceSource(source?: string): LogSource {
  const s = (source ?? "").toLowerCase();
  if (s.includes("email") || s.includes("outlook")) return "email";
  if (s.includes("file") || s.includes("doc")) return "file";
  return "manual";
}

export function migrateToV3(raw: unknown): ArgusData {
  const data = raw as LegacyV2 & ArgusData;
  const now = new Date().toISOString();

  if (data.version === 3 && Array.isArray(data.entities)) {
    return normalizeArgusData({
      entities: data.entities,
      logs: (data.logs ?? []).map(normalizeLog),
      inboxItems: data.inboxItems ?? [],
      attachments: data.attachments ?? [],
      runbooks: data.runbooks ?? [],
      runbookProgress: data.runbookProgress ?? [],
      version: 3,
    });
  }

  const entities: Entity[] = (data.contacts ?? []).map((c) => {
    const parts = [c.role, c.department, c.relationship, c.email, c.phone, c.notes].filter(Boolean);
    return {
      id: c.id,
      type: "person" as const,
      name: c.name,
      alias: "",
      notes: parts.join(" · "),
      strategicValue: 3 as const,
      createdAt: c.createdAt ?? now,
      updatedAt: c.createdAt ?? now,
    };
  });

  const logs: Log[] = (data.entries ?? []).map((e) => ({
    id: e.id,
    kind: "log" as const,
    date: e.date,
    title: e.title,
    body: e.description,
    entityIds: e.contactIds ?? [],
    classificationStatus: (e.contactIds ?? []).length > 0 ? "classified" : "needs_classification",
    private: e.private ?? false,
    source: "manual" as const,
    attachmentIds: [],
    topics: [],
    createdAt: e.createdAt ?? now,
    updatedAt: e.updatedAt ?? e.createdAt ?? now,
  }));

  for (const ev of data.evidence ?? []) {
    const parent = (data.entries ?? []).find((e) => e.id === ev.entryId);
    logs.push({
      id: ev.id,
      kind: "log" as const,
      date: ev.date,
      title: ev.title,
      body: ev.content,
      entityIds: parent?.contactIds ?? [],
      classificationStatus: (parent?.contactIds ?? []).length > 0 ? "classified" : "needs_classification",
      private: parent?.private ?? false,
      source: mapEvidenceSource(ev.source),
      attachmentIds: ev.attachmentName ? [ev.id] : [],
      topics: [],
      createdAt: ev.createdAt ?? now,
      updatedAt: ev.createdAt ?? now,
    });
  }

  return normalizeArgusData({
    entities,
    logs,
    inboxItems: [],
    attachments: (data.evidence ?? [])
      .filter((e) => e.attachmentName)
      .map((e) => ({
        id: e.id,
        fileName: e.attachmentName!,
        mimeType: e.attachmentMime ?? "application/octet-stream",
        createdAt: e.createdAt ?? now,
        parentType: "journal" as const,
        parentId: e.entryId ?? e.id,
      })),
    runbooks: [],
    runbookProgress: [],
    version: 3,
  });
}
