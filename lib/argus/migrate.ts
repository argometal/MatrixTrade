import type {
  ArgusData,
  Contact,
  Entry,
  EntryStatus,
  EntryType,
  Evidence,
  EvidenceType,
  InteractionKind,
} from "./types";

const LEGACY_ENTRY_TYPE: Record<string, EntryType> = {
  queja: "observation",
  incidente: "event",
  comportamiento: "interaction",
  correspondencia: "correspondence",
};

const LEGACY_STATUS: Record<string, EntryStatus> = {
  abierto: "open",
  documentado: "documented",
  resuelto: "resolved",
  escalado: "follow_up",
};

const LEGACY_EVIDENCE_TYPE: Record<string, EvidenceType> = {
  mensaje: "message",
  documento: "document",
  captura: "screenshot",
  testigo: "witness",
  nota: "note",
};

function mapEntryType(raw: string): EntryType {
  return LEGACY_ENTRY_TYPE[raw] ?? (raw as EntryType);
}

function mapStatus(raw: string): EntryStatus {
  return LEGACY_STATUS[raw] ?? (raw as EntryStatus);
}

function mapEvidenceType(raw: string): EvidenceType {
  return LEGACY_EVIDENCE_TYPE[raw] ?? (raw as EvidenceType);
}

function mapInteraction(raw: string | undefined): InteractionKind | undefined {
  if (raw === "correcto") return "positive";
  if (raw === "incorrecto") return "negative";
  if (raw === "positive" || raw === "negative") return raw;
  return undefined;
}

interface LegacyPerson {
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

interface LegacyRecord {
  id: string;
  type: string;
  title: string;
  date: string;
  description: string;
  personIds?: string[];
  contactIds?: string[];
  status: string;
  behaviorKind?: string;
  interactionKind?: string;
  tags?: string[];
  secret?: boolean;
  private?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface LegacyEvidence {
  id: string;
  recordId?: string;
  entryId?: string;
  type: string;
  title: string;
  date: string;
  content: string;
  source?: string;
  personId?: string;
  contactId?: string;
  attachmentName?: string;
  attachmentMime?: string;
  createdAt?: string;
}

interface LegacyVaultV1 {
  people?: LegacyPerson[];
  contacts?: Contact[];
  records?: LegacyRecord[];
  entries?: Entry[];
  evidence?: LegacyEvidence[];
  version?: number;
}

export function migrateToArgusData(raw: LegacyVaultV1): ArgusData {
  const now = new Date().toISOString();

  if (raw.version === 2 && raw.contacts && raw.entries) {
    return {
      contacts: raw.contacts,
      entries: raw.entries.map((e) => ({
        ...e,
        private: e.private ?? false,
        contactIds: e.contactIds ?? [],
        tags: e.tags ?? [],
      })),
      evidence: (raw.evidence ?? []).map((e) => ({
        ...e,
        entryId: e.entryId,
        type: mapEvidenceType(e.type),
      })) as Evidence[],
      version: 2,
    };
  }

  const contacts: Contact[] = (raw.people ?? raw.contacts ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role ?? "",
    department: p.department ?? "",
    relationship: p.relationship ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    notes: p.notes ?? "",
    createdAt: p.createdAt ?? now,
  }));

  const entries: Entry[] = (raw.records ?? raw.entries ?? []).map((r) => {
    const legacy = r as LegacyRecord;
    return {
      id: legacy.id,
      type: mapEntryType(legacy.type),
      title: legacy.title,
      date: legacy.date,
      description: legacy.description,
      contactIds: legacy.contactIds ?? legacy.personIds ?? [],
      status: mapStatus(legacy.status),
      interactionKind:
        mapEntryType(legacy.type) === "interaction"
          ? mapInteraction(legacy.interactionKind ?? legacy.behaviorKind)
          : mapInteraction(legacy.interactionKind ?? legacy.behaviorKind),
      tags: legacy.tags ?? [],
      private: legacy.private ?? legacy.secret ?? false,
      createdAt: legacy.createdAt ?? now,
      updatedAt: legacy.updatedAt ?? legacy.createdAt ?? now,
    };
  });

  const evidence: Evidence[] = (raw.evidence ?? []).map((e) => ({
    id: e.id,
    entryId: e.entryId ?? e.recordId ?? "",
    type: mapEvidenceType(e.type),
    title: e.title,
    date: e.date,
    content: e.content,
    source: e.source ?? "",
    contactId: e.contactId ?? e.personId,
    attachmentName: e.attachmentName,
    attachmentMime: e.attachmentMime,
    createdAt: e.createdAt ?? now,
  }));

  return { contacts, entries, evidence, version: 2 };
}
