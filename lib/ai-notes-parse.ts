import { AI_NOTE_TYPES, type AiNoteType, type ParsedAiNoteDraft } from "./ai-notes-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNoteType(obj: Record<string, unknown>): AiNoteType | null {
  const raw = readString(obj, "note_type", "noteType", "type");
  if (!raw) return null;
  const normalized = raw.toLowerCase() as AiNoteType;
  return AI_NOTE_TYPES.includes(normalized) ? normalized : null;
}

function readProposalJson(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const value = obj.proposal_json ?? obj.proposalJson ?? obj.proposal;
  if (!value) return undefined;
  if (isRecord(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function draftFromObject(obj: Record<string, unknown>): ParsedAiNoteDraft | null {
  const noteType = readNoteType(obj);
  const body = readString(obj, "body", "text", "content", "note");
  if (!noteType || !body) return null;

  const tradeId = readString(obj, "trade_id", "tradeId");
  const date = readString(obj, "date", "created_at", "createdAt");

  return {
    tradeId: tradeId?.match(/^H\d{3}$/i) ? tradeId.toUpperCase() : tradeId,
    noteType,
    body,
    proposalJson: readProposalJson(obj),
    date,
  };
}

function extractNoteObjects(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) {
    return parsed.filter(isRecord);
  }
  if (!isRecord(parsed)) return [];

  if (Array.isArray(parsed.notes)) {
    return parsed.notes.filter(isRecord);
  }
  if (parsed.note_type || parsed.noteType || parsed.type) {
    return [parsed];
  }
  return [];
}

export function parseAiNotesPaste(raw: string): {
  ok: true;
  notes: ParsedAiNoteDraft[];
} | {
  ok: false;
  error: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste is empty." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      error: "Invalid JSON. Paste an array of notes or { \"notes\": [...] } from your AI assistant.",
    };
  }

  const objects = extractNoteObjects(parsed);
  if (objects.length === 0) {
    return {
      ok: false,
      error: "No notes found. Each item needs note_type and body.",
    };
  }

  const notes: ParsedAiNoteDraft[] = [];
  const errors: string[] = [];

  objects.forEach((obj, index) => {
    const draft = draftFromObject(obj);
    if (draft) {
      notes.push(draft);
      return;
    }
    const type = readString(obj, "note_type", "noteType", "type") ?? "(missing)";
    errors.push(`Item ${index + 1}: invalid note_type "${type}" or missing body`);
  });

  if (notes.length === 0) {
    return {
      ok: false,
      error: errors.join("; ") || "Could not parse any notes.",
    };
  }

  return { ok: true, notes };
}

export function aiNotesPasteExample(): string {
  return JSON.stringify(
    {
      notes: [
        {
          note_type: "analysis",
          trade_id: "H001",
          body: "Entry quality was fine; exit was early relative to planned target.",
        },
        {
          note_type: "risk",
          body: "Remaining loss budget supports one more full-size loss at current sizing.",
        },
        {
          note_type: "action",
          body: "Review H001 before opening H002.",
          proposal_json: {
            type: "trade-review",
            proposal: { tradeId: "H001", lesson: "Wait for confirmation." },
          },
        },
      ],
    },
    null,
    2
  );
}
