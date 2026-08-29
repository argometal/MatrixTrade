/**
 * CHANGE 24-17 — Molecular overlay placeholders for Argus Realm graph.
 * Affinity / molecule ≠ formal Argus relation. Future MTA may fill scores.
 */

export type AffinityConfirmationState =
  | "provisional"
  | "suggested"
  | "confirmed"
  | "rejected";

export type ActivityLevel = "still" | "breathing" | "active";

export type SuggestionState = "none" | "suggested" | "confirmed" | "rejected";

/** Optional molecular overlay fields prepared for MTA / Alexandria export later. */
export type MolecularDeckHints = {
  massScore: number;
  lastUsedAt: string | null;
  activityLevel: ActivityLevel;
  affinityIds: string[];
  affinityScore: number | null;
  affinityReason: string | null;
  recurrenceScore: number | null;
  decayScore: number | null;
  suggestedClusterId: string | null;
  suggestionState: SuggestionState;
};

export type MolecularAffinity = {
  id: string;
  realmId: string;
  deckIds: string[];
  affinityScore: number | null;
  affinityReason: string | null;
  confirmationState: AffinityConfirmationState;
  source: "structural" | "tag_placeholder" | "mta_pending";
  createdAt: string;
  recurrenceScore: number | null;
  decayScore: number | null;
  suggestedClusterId: string | null;
  suggestionState: SuggestionState;
};

export type MolecularOverlayState = {
  version: 1;
  affinities: MolecularAffinity[];
  deckHints: Record<string, Partial<MolecularDeckHints>>;
};

export const MOLECULAR_OVERLAY_KEY = "argusforge-realm-molecular-v1";

export const EMPTY_MOLECULAR_OVERLAY: MolecularOverlayState = {
  version: 1,
  affinities: [],
  deckHints: {},
};

export function normalizeMolecularOverlay(raw: unknown): MolecularOverlayState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_MOLECULAR_OVERLAY };
  const o = raw as Record<string, unknown>;
  const affinities = Array.isArray(o.affinities)
    ? (o.affinities as MolecularAffinity[]).map((a) => ({
        id: String(a.id),
        realmId: String(a.realmId),
        deckIds: Array.isArray(a.deckIds) ? a.deckIds.map(String) : [],
        affinityScore: typeof a.affinityScore === "number" ? a.affinityScore : null,
        affinityReason: a.affinityReason ?? null,
        confirmationState: a.confirmationState ?? "provisional",
        source:
          a.source === "structural" ||
          a.source === "tag_placeholder" ||
          a.source === "mta_pending"
            ? a.source
            : ("structural" as const),
        createdAt: a.createdAt ?? new Date().toISOString(),
        recurrenceScore: typeof a.recurrenceScore === "number" ? a.recurrenceScore : null,
        decayScore: typeof a.decayScore === "number" ? a.decayScore : null,
        suggestedClusterId: a.suggestedClusterId ?? null,
        suggestionState: a.suggestionState ?? "suggested",
      }))
    : [];
  const deckHints =
    o.deckHints && typeof o.deckHints === "object"
      ? (o.deckHints as Record<string, Partial<MolecularDeckHints>>)
      : {};
  return { version: 1, affinities, deckHints };
}

export function readMolecularOverlay(): MolecularOverlayState {
  if (typeof window === "undefined") return { ...EMPTY_MOLECULAR_OVERLAY };
  try {
    const raw = localStorage.getItem(MOLECULAR_OVERLAY_KEY);
    if (!raw) return { ...EMPTY_MOLECULAR_OVERLAY };
    const next = normalizeMolecularOverlay(JSON.parse(raw));
    writeMolecularOverlay(next);
    return next;
  } catch {
    return { ...EMPTY_MOLECULAR_OVERLAY };
  }
}

export function writeMolecularOverlay(state: MolecularOverlayState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MOLECULAR_OVERLAY_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}
