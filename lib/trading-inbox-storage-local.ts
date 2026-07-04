import { promises as fs } from "fs";
import path from "path";
import type { BridgeInboxItem } from "./bridge";

const INBOX_FILE = path.join(process.cwd(), "data", "trading-inbox.json");

interface LocalInboxFile {
  items: Array<{
    id: string;
    receivedAt: string;
    status: "pending" | "applied" | "rejected";
    payload: Record<string, unknown>;
  }>;
}

async function readLocalFile(): Promise<LocalInboxFile> {
  try {
    const raw = await fs.readFile(INBOX_FILE, "utf-8");
    const parsed = JSON.parse(raw) as LocalInboxFile;
    if (parsed?.items && Array.isArray(parsed.items)) return parsed;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
  return { items: [] };
}

async function writeLocalFile(data: LocalInboxFile): Promise<void> {
  await fs.mkdir(path.dirname(INBOX_FILE), { recursive: true });
  const tmp = `${INBOX_FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, INBOX_FILE);
}

export async function listLocalInboxItems(): Promise<BridgeInboxItem[]> {
  const file = await readLocalFile();
  return file.items
    .filter((item) => item.status === "pending")
    .map((item) => ({ ...item, origin: "local" as const }));
}

export async function createLocalInboxItem(
  payload: Record<string, unknown>
): Promise<BridgeInboxItem> {
  const file = await readLocalFile();
  const item = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    status: "pending" as const,
    payload,
  };
  file.items.push(item);
  await writeLocalFile(file);
  return { ...item, origin: "local" };
}

export async function getLocalInboxItem(id: string): Promise<BridgeInboxItem | undefined> {
  const file = await readLocalFile();
  const item = file.items.find((row) => row.id === id);
  return item ? { ...item, origin: "local" } : undefined;
}

export async function setLocalInboxStatus(
  id: string,
  status: "applied" | "rejected"
): Promise<boolean> {
  const file = await readLocalFile();
  const item = file.items.find((row) => row.id === id);
  if (!item) return false;
  item.status = status;
  await writeLocalFile(file);
  return true;
}
