/**
 * Memory Registry — identity + pointers (Phase 0 lock).
 * Not a product database. Not Alexandria. Not blob storage of product truth.
 */

import type { OperationalPlacement } from "./organization";
import { defaultOperationalPlacement } from "./organization";

export const MEMORY_SOURCES = ["mta", "argus", "chaos", "alexandria", "other"] as const;

export type MemorySource = (typeof MEMORY_SOURCES)[number];

/**
 * URI schemes (Phase 0).
 * alex:// is reserved — Alexandria FROZEN; no resolver in Phase 1.
 */
export type MemoryPointer =
  | `matrix://${string}`
  | `argus://${string}`
  | `chaos://${string}`
  | `alex://${string}`;

export type MemoryAnnotation = {
  id: string;
  createdAt: string;
  kind: string;
  body: string;
  /** Overlays only — never replace product truth. */
  author: "human" | "ai" | "system";
};

/**
 * Common identity in the known universe.
 * Owns identity + pointer + shared context + operational placement.
 * Does not own trade/evidence/locus bytes.
 */
export type MemoryEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: MemorySource;
  /** Id in the product or staging store when known. */
  externalId?: string;
  pointer: MemoryPointer;
  /** Lightweight shared context — not a document body. */
  context?: string;
  /** Link to Chaos unit when source is chaos / capture. */
  chaosId?: string;
  placement: OperationalPlacement;
  annotations?: MemoryAnnotation[];
};

export function createChaosMemoryEntry(input: {
  id: string;
  chaosId: string;
  nowIso: string;
  context?: string;
}): MemoryEntry {
  return {
    id: input.id,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
    source: "chaos",
    externalId: input.chaosId,
    pointer: `chaos://${input.chaosId}`,
    chaosId: input.chaosId,
    context: input.context,
    placement: defaultOperationalPlacement(),
  };
}
