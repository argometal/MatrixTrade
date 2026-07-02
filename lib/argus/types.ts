export type EntryType =
  | "observation"
  | "event"
  | "interaction"
  | "correspondence"
  | "meeting"
  | "networking"
  | "opportunity"
  | "recognition"
  | "follow_up"
  | "note";

export type InteractionKind = "positive" | "negative";

export type EntryStatus = "open" | "documented" | "resolved" | "follow_up" | "archived";

export type EvidenceType =
  | "email"
  | "message"
  | "document"
  | "screenshot"
  | "witness"
  | "note"
  | "recording"
  | "attachment";

export interface Contact {
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

export interface Entry {
  id: string;
  type: EntryType;
  title: string;
  date: string;
  description: string;
  contactIds: string[];
  status: EntryStatus;
  interactionKind?: InteractionKind;
  tags: string[];
  /** Visible only when ARGUS_PRIVATE_PIN is unlocked */
  private: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  entryId: string;
  type: EvidenceType;
  title: string;
  date: string;
  content: string;
  source: string;
  contactId?: string;
  attachmentName?: string;
  attachmentMime?: string;
  createdAt: string;
}

export interface ArgusData {
  contacts: Contact[];
  entries: Entry[];
  evidence: Evidence[];
  version: 2;
}

export type ContactInput = Omit<Contact, "id" | "createdAt">;
export type EntryInput = Omit<Entry, "id" | "createdAt" | "updatedAt">;
export type EvidenceInput = Omit<Evidence, "id" | "createdAt">;

export interface ArgusStats {
  totalEntries: number;
  totalEvidence: number;
  totalContacts: number;
  openEntries: number;
  privateEntries: number;
}
