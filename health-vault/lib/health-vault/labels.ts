import type { BehaviorKind, EvidenceType, RecordStatus, RecordType } from "./types";

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  queja: "Queja",
  incidente: "Incidente",
  comportamiento: "Comportamiento",
  correspondencia: "Correspondencia",
};

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  abierto: "Abierto",
  documentado: "Documentado",
  resuelto: "Resuelto",
  escalado: "Escalado",
};

export const BEHAVIOR_LABELS: Record<BehaviorKind, string> = {
  correcto: "Correcto",
  incorrecto: "Incorrecto",
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  email: "Correo",
  mensaje: "Mensaje",
  documento: "Documento",
  captura: "Captura",
  testigo: "Testigo",
  nota: "Nota",
};

export const RECORD_TYPES: RecordType[] = ["queja", "incidente", "comportamiento", "correspondencia"];
export const RECORD_STATUSES: RecordStatus[] = ["abierto", "documentado", "resuelto", "escalado"];
export const BEHAVIOR_KINDS: BehaviorKind[] = ["correcto", "incorrecto"];
export const EVIDENCE_TYPES: EvidenceType[] = ["email", "mensaje", "documento", "captura", "testigo", "nota"];
export const RELATIONSHIPS = ["Jefe directo", "RH", "Compañero", "Testigo", "Cliente interno", "Otro"];
