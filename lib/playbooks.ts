import { promises as fs } from "fs";
import path from "path";
import type { Playbook } from "./playbook-types";

const PLAYBOOKS_FILE = path.join(process.cwd(), "data", "playbooks.json");

export async function getPlaybooks(): Promise<Playbook[]> {
  try {
    const raw = await fs.readFile(PLAYBOOKS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Playbook[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getPlaybookName(playbooks: Playbook[], playbookId?: string): string | null {
  if (!playbookId) return null;
  return playbooks.find((p) => p.id === playbookId)?.name ?? null;
}
