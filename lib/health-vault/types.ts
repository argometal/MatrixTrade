export type RecordType = "queja" | "incidente" | "comportamiento" | "correspondencia";
export type BehaviorKind = "correcto" | "incorrecto";
export type RecordStatus = "abierto" | "documentado" | "resuelto" | "escalado";
export type EvidenceType = "email" | "mensaje" | "documento" | "captura" | "testigo" | "nota";

export interface Person {
  id: string;
  name: string;
  role: string;
  department: string;
  relationship: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
}

export interface WorkRecord {
  id: string;
  type: RecordType;
  title: string;
  date: string;
  description: string;
  personIds: string[];
  status: RecordStatus;
  behaviorKind?: BehaviorKind;
  tags: string[];
  /** Solo visible con HEALTH_VAULT_SECRET desbloqueado */
  secret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  recordId: string;
  type: EvidenceType;
  title: string;
  date: string;
  content: string;
  source: string;
  personId?: string;
  attachmentName?: string;
  attachmentMime?: string;
  createdAt: string;
}

export interface VaultData {
  people: Person[];
  records: WorkRecord[];
  evidence: Evidence[];
  version: 1;
}

export type PersonInput = Omit<Person, "id" | "createdAt">;
export type RecordInput = Omit<WorkRecord, "id" | "createdAt" | "updatedAt">;
export type EvidenceInput = Omit<Evidence, "id" | "createdAt">;

export interface VaultStats {
  totalRecords: number;
  totalEvidence: number;
  totalPeople: number;
  openRecords: number;
  secretRecords: number;
}
