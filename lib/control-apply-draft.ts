/**
 * 30-27 — Handoff of prepared AI Block JSON into Control → Apply.
 * sessionStorage survives the Scout → Apply drawer open on mobile Safari
 * when clipboard write is blocked or unreliable.
 */
export const CONTROL_APPLY_DRAFT_KEY = "mta.control.applyDraft.v1";

export function stashControlApplyDraft(json: string): void {
  if (typeof window === "undefined") return;
  const value = json.trim();
  if (!value) return;
  try {
    sessionStorage.setItem(CONTROL_APPLY_DRAFT_KEY, value);
  } catch {
    /* private mode / quota — Apply may still receive via openPanel context */
  }
}

/** Read and clear the pending Apply draft (consume-once). */
export function consumeControlApplyDraft(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(CONTROL_APPLY_DRAFT_KEY);
    if (value !== null) sessionStorage.removeItem(CONTROL_APPLY_DRAFT_KEY);
    const trimmed = value?.trim() ?? "";
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

export function clearControlApplyDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CONTROL_APPLY_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
