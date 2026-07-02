import type { EntryStatus, EntryType, EvidenceType, InteractionKind } from "./types";

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  observation: "Observation",
  event: "Event",
  interaction: "Interaction",
  correspondence: "Correspondence",
  meeting: "Meeting",
  networking: "Networking",
  opportunity: "Opportunity",
  recognition: "Recognition",
  follow_up: "Follow-up",
  note: "Note",
};

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  open: "Open",
  documented: "Documented",
  resolved: "Resolved",
  follow_up: "Follow-up",
  archived: "Archived",
};

export const INTERACTION_LABELS: Record<InteractionKind, string> = {
  positive: "Positive",
  negative: "Negative",
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  email: "Email",
  message: "Message",
  document: "Document",
  screenshot: "Screenshot",
  witness: "Witness",
  note: "Note",
  recording: "Recording",
  attachment: "Attachment",
};

export const ENTRY_TYPES: EntryType[] = [
  "note",
  "meeting",
  "networking",
  "observation",
  "event",
  "interaction",
  "correspondence",
  "opportunity",
  "recognition",
  "follow_up",
];

export const ENTRY_STATUSES: EntryStatus[] = ["open", "documented", "resolved", "follow_up", "archived"];

export const INTERACTION_KINDS: InteractionKind[] = ["positive", "negative"];

export const EVIDENCE_TYPES: EvidenceType[] = [
  "email",
  "message",
  "note",
  "document",
  "screenshot",
  "recording",
  "witness",
  "attachment",
];

export const RELATIONSHIPS = [
  "Direct manager",
  "HR",
  "Colleague",
  "Client",
  "Witness",
  "Partner",
  "Other",
];
