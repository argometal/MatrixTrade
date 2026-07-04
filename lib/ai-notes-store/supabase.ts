import { createSupabaseAdmin } from "../supabase/server";
import type { AiNote, AiNoteType, CreateAiNoteInput } from "../ai-notes-types";
import { AI_NOTE_TYPES } from "../ai-notes-types";

interface AiNoteRow {
  id: string;
  trade_id: string | null;
  snapshot_revision: number;
  note_date: string;
  note_type: string;
  body: string;
  proposal_json: Record<string, unknown> | null;
  created_at: string;
}

function rowToNote(row: AiNoteRow): AiNote {
  return {
    id: row.id,
    tradeId: row.trade_id ?? undefined,
    snapshotRevision: row.snapshot_revision,
    date: row.note_date,
    noteType: row.note_type as AiNoteType,
    body: row.body,
    proposalJson: row.proposal_json ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listSupabaseAiNotes(limit = 50): Promise<AiNote[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase ai_notes read failed: ${error.message}`);
  }

  return (data as AiNoteRow[]).map(rowToNote);
}

export async function createSupabaseAiNote(input: CreateAiNoteInput): Promise<AiNote> {
  const now = new Date().toISOString();
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_notes")
    .insert({
      trade_id: input.tradeId ?? null,
      snapshot_revision: input.snapshotRevision,
      note_date: input.date ?? now,
      note_type: input.noteType,
      body: input.body.trim(),
      proposal_json: input.proposalJson ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Supabase ai_notes insert failed: ${error?.message ?? "unknown"}`);
  }

  const noteType = (data as AiNoteRow).note_type;
  if (!AI_NOTE_TYPES.includes(noteType as AiNoteType)) {
    throw new Error(`Invalid note_type stored: ${noteType}`);
  }

  return rowToNote(data as AiNoteRow);
}
