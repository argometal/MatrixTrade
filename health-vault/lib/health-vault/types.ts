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
  createdAt: string;
}

export interface VaultData {
  people: Person[];
  records: WorkRecord[];
  evidence: Evidence[];
  seeded: boolean;
}

export type PersonInput = Omit<Person, "id" | "createdAt">;
export type RecordInput = Omit<WorkRecord, "id" | "createdAt" | "updatedAt">;
export type EvidenceInput = Omit<Evidence, "id" | "createdAt">;
