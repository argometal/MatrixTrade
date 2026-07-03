import { readPlaybooksFromStore } from "./playbooks-store";
import type { Playbook } from "./playbook-types";

export async function getPlaybooks(): Promise<Playbook[]> {
  return readPlaybooksFromStore();
}

export function getPlaybookName(playbooks: Playbook[], playbookId?: string): string | null {
  if (!playbookId) return null;
  return playbooks.find((p) => p.id === playbookId)?.name ?? null;
}
