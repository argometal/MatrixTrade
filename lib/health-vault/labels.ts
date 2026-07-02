import type { BehaviorKind, EvidenceType, RecordStatus, RecordType } from "./types";

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  queja: "Complaint",
  incidente: "Incident",
  comportamiento: "Behavior",
  correspondencia: "Correspondence",
};

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  abierto: "Open",
  documentado: "Documented",
  resuelto: "Resolved",
  escalado: "Escalated",
};

export const BEHAVIOR_LABELS: Record<BehaviorKind, string> = {
  correcto: "Positive",
  incorrecto: "Negative",
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  email: "Email",
  mensaje: "Message",
  documento: "Document",
  captura: "Screenshot",
  testigo: "Witness",
  nota: "Note",
};

export const RECORD_TYPES: RecordType[] = ["queja", "incidente", "comportamiento", "correspondencia"];
export const RECORD_STATUSES: RecordStatus[] = ["abierto", "documentado", "resuelto", "escalado"];
export const BEHAVIOR_KINDS: BehaviorKind[] = ["correcto", "incorrecto"];
export const EVIDENCE_TYPES: EvidenceType[] = ["email", "mensaje", "documento", "captura", "testigo", "nota"];
export const RELATIONSHIPS = [
  "Direct manager",
  "HR",
  "Colleague",
  "Witness",
  "Internal client",
  "Other",
];
