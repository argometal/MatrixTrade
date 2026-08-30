/**
 * AF03 §12 — Vault preparation boundary (prototype).
 * Not final Vault automation. Selected Chaos content → review queue only.
 * Separate localStorage key from repo store.
 */

export type Af03VaultPrep = {
  id: string;
  deckId: string;
  deckTitle: string;
  itemIds: string[];
  sources: Array<{
    itemId: string;
    title: string;
    kind: string;
    sourceRef: string | null;
    chaosPath: string;
  }>;
  note: string;
  humanReviewRequired: true;
  status: "awaiting_review" | "dismissed";
  createdAt: string;
};

export const AF03_VAULT_PREP_KEY = "argusforge-af03-vault-prep-v1";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `vprep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function listVaultPreps(): Af03VaultPrep[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AF03_VAULT_PREP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Af03VaultPrep[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeVaultPreps(list: Af03VaultPrep[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AF03_VAULT_PREP_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function createVaultPrep(input: {
  deckId: string;
  deckTitle: string;
  items: Array<{
    id: string;
    title: string;
    kind: string;
    sourceRef: string | null;
  }>;
  note?: string;
}): Af03VaultPrep {
  const prep: Af03VaultPrep = {
    id: newId(),
    deckId: input.deckId,
    deckTitle: input.deckTitle,
    itemIds: input.items.map((i) => i.id),
    sources: input.items.map((i) => ({
      itemId: i.id,
      title: i.title,
      kind: i.kind,
      sourceRef: i.sourceRef,
      chaosPath: `/forge/deck/${input.deckId}/item/${i.id}/view`,
    })),
    note: input.note?.trim() || "",
    humanReviewRequired: true,
    status: "awaiting_review",
    createdAt: nowIso(),
  };
  const next = [prep, ...listVaultPreps()];
  writeVaultPreps(next);
  return prep;
}

export function dismissVaultPrep(id: string): Af03VaultPrep[] {
  const next = listVaultPreps().map((p) =>
    p.id === id ? { ...p, status: "dismissed" as const } : p
  );
  writeVaultPreps(next);
  return next;
}
