import { readPlaybooksFromStore, getPlaybooksStore } from "./playbooks-store";
import type { Playbook, PlaybookStatus } from "./playbook-types";

export async function getPlaybooks(): Promise<Playbook[]> {
  return readPlaybooksFromStore();
}

export async function getPlaybookById(id: string): Promise<Playbook | undefined> {
  const playbooks = await getPlaybooks();
  return playbooks.find((p) => p.id === id);
}

export async function upsertPlaybook(playbook: Playbook): Promise<void> {
  await getPlaybooksStore().upsert(playbook);
}

export function getPlaybookName(playbooks: Playbook[], playbookId?: string): string | null {
  if (!playbookId) return null;
  return playbooks.find((p) => p.id === playbookId)?.name ?? null;
}

export function slugifyPlaybookId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parsePlaybookStatus(value: unknown): PlaybookStatus {
  const raw = String(value ?? "TESTING").toUpperCase();
  if (raw === "ACTIVE" || raw === "RETIRED") return raw;
  return "TESTING";
}

export function parsePlaybookChecklist(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}
