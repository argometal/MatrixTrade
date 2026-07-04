import { isSupabaseTradesStore } from "./trades-json";
import type { AiNote, CreateAiNoteInput } from "./ai-notes-types";
import { createJsonAiNote, listJsonAiNotes } from "./ai-notes-store/json";
import { createSupabaseAiNote, listSupabaseAiNotes } from "./ai-notes-store/supabase";

function isSupabaseNotesStore(): boolean {
  if (isSupabaseTradesStore()) return true;
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export async function listAiNotes(limit = 50): Promise<AiNote[]> {
  if (isSupabaseNotesStore()) {
    return listSupabaseAiNotes(limit);
  }
  return listJsonAiNotes(limit);
}

export async function createAiNote(input: CreateAiNoteInput): Promise<AiNote> {
  if (isSupabaseNotesStore()) {
    return createSupabaseAiNote(input);
  }
  return createJsonAiNote(input);
}

export async function createAiNotes(inputs: CreateAiNoteInput[]): Promise<AiNote[]> {
  const created: AiNote[] = [];
  for (const input of inputs) {
    created.push(await createAiNote(input));
  }
  return created;
}
