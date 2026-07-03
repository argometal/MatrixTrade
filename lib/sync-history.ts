import { promises as fs } from "fs";
import path from "path";

const HISTORY_FILE = path.join(process.cwd(), "data", "sync-history.json");
const MAX_ENTRIES = 20;

export interface SyncHistoryEntry {
  at: string;
  ok: boolean;
  httpStatus?: number;
  snapshotRevision?: number;
  updatedAt?: string;
  error?: string;
}

interface SyncHistoryFile {
  entries: SyncHistoryEntry[];
}

export async function getSyncHistory(): Promise<SyncHistoryEntry[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    const data = JSON.parse(raw) as SyncHistoryFile;
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

export async function appendSyncHistory(entry: SyncHistoryEntry): Promise<void> {
  const entries = await getSyncHistory();
  entries.unshift(entry);
  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
  const tmp = `${HISTORY_FILE}.tmp`;
  await fs.writeFile(
    tmp,
    `${JSON.stringify({ entries: entries.slice(0, MAX_ENTRIES) }, null, 2)}\n`,
    "utf-8"
  );
  await fs.rename(tmp, HISTORY_FILE);
}
