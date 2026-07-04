import { promises as fs } from "fs";
import path from "path";
import type { AiNote, CreateAiNoteInput } from "../ai-notes-types";

const NOTES_FILE = path.join(process.cwd(), "data", "ai-notes.json");

interface NotesFile {
  notes: AiNote[];
}

async function readFile(): Promise<NotesFile> {
  try {
    const raw = await fs.readFile(NOTES_FILE, "utf-8");
    const parsed = JSON.parse(raw) as NotesFile;
    if (parsed?.notes && Array.isArray(parsed.notes)) return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
  return { notes: [] };
}

async function writeFile(data: NotesFile): Promise<void> {
  await fs.mkdir(path.dirname(NOTES_FILE), { recursive: true });
  const tmp = `${NOTES_FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, NOTES_FILE);
}

export async function listJsonAiNotes(limit = 50): Promise<AiNote[]> {
  const file = await readFile();
  return file.notes
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function createJsonAiNote(input: CreateAiNoteInput): Promise<AiNote> {
  const now = new Date().toISOString();
  const note: AiNote = {
    id: crypto.randomUUID(),
    tradeId: input.tradeId,
    snapshotRevision: input.snapshotRevision,
    date: input.date ?? now,
    noteType: input.noteType,
    body: input.body.trim(),
    proposalJson: input.proposalJson,
    createdAt: now,
  };

  const file = await readFile();
  file.notes.push(note);
  await writeFile(file);
  return note;
}
