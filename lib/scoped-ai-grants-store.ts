import { promises as fs } from "fs";
import path from "path";
import type { ScopedAiGrant } from "./scoped-ai-grant-types";

const GRANTS_FILE = path.join(process.cwd(), "data", "scoped-ai-grants.json");

export async function readScopedAiGrantsFile(): Promise<ScopedAiGrant[]> {
  try {
    const raw = await fs.readFile(GRANTS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as ScopedAiGrant[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writeScopedAiGrantsFile(grants: ScopedAiGrant[]): Promise<void> {
  await fs.mkdir(path.dirname(GRANTS_FILE), { recursive: true });
  await fs.writeFile(GRANTS_FILE, `${JSON.stringify(grants, null, 2)}\n`, "utf-8");
}

export async function upsertScopedAiGrant(grant: ScopedAiGrant): Promise<void> {
  const all = await readScopedAiGrantsFile();
  const index = all.findIndex((row) => row.id === grant.id);
  if (index >= 0) all[index] = grant;
  else all.push(grant);
  await writeScopedAiGrantsFile(all);
}

export async function getScopedAiGrantById(id: string): Promise<ScopedAiGrant | undefined> {
  const all = await readScopedAiGrantsFile();
  return all.find((row) => row.id === id);
}
