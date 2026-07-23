/**
 * Chaos — capture unit (ArgusForge Phase 1 contract).
 * Not a learning unit. No spatial restrictions. May grow indefinitely.
 * Distinct from Chaos Coordination (tools/Chaos) until a later ADR merges them.
 */

export const CHAOS_PART_KINDS = [
  "text",
  "image",
  "pdf",
  "audio",
  "link",
  "note",
  "derivative",
  "metadata",
] as const;

export type ChaosPartKind = (typeof CHAOS_PART_KINDS)[number];

/** One fragment inside a Chaos capture unit. */
export type ChaosPart = {
  id: string;
  kind: ChaosPartKind;
  /** Inline text / URL / JSON metadata string — or empty when bytes live elsewhere. */
  content?: string;
  /** Pointer to staged or product-owned bytes (never product truth inside Forge). */
  pointer?: string;
  mimeType?: string;
  createdAt: string;
  meta?: Record<string, string | number | boolean | null>;
};

/**
 * Chaos capture unit — unbounded collection of parts + metadata.
 * Registers identity via Memory Registry; does not become a learning unit here.
 */
export type ChaosUnit = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  parts: ChaosPart[];
  /** Free-form capture metadata; not semantic relations. */
  metadata?: Record<string, string | number | boolean | null>;
  /** Source channel for the capture. */
  source?: "phone" | "web" | "import" | "ai-handoff" | "other";
};

export function createEmptyChaosUnit(id: string, nowIso: string): ChaosUnit {
  return {
    id,
    createdAt: nowIso,
    updatedAt: nowIso,
    parts: [],
  };
}
