export const AI_NOTE_TYPES = [
  "analysis",
  "risk",
  "strategy",
  "lesson",
  "action",
] as const;

export type AiNoteType = (typeof AI_NOTE_TYPES)[number];

export interface AiNote {
  id: string;
  tradeId?: string;
  snapshotRevision: number;
  /** When the note applies / was authored (ISO 8601). */
  date: string;
  noteType: AiNoteType;
  body: string;
  proposalJson?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAiNoteInput {
  tradeId?: string;
  snapshotRevision: number;
  date?: string;
  noteType: AiNoteType;
  body: string;
  proposalJson?: Record<string, unknown>;
}

export interface ParsedAiNoteDraft {
  tradeId?: string;
  noteType: AiNoteType;
  body: string;
  proposalJson?: Record<string, unknown>;
  date?: string;
}
