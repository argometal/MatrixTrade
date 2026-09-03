/**
 * P10 — Minimum CREATE capture helpers.
 * executableEntry ≡ plannedEntry (reuse; no second live price column).
 * originalEntry is immutable once set.
 */

import type { TradePlan } from "./plan-types";

export type ScoutCaptureFields = {
  participationBlocker?: string;
  reviseIf?: string[];
  originalEntry?: number;
  /** Alias for plannedEntry — current executable level. */
  executableEntry?: number;
};

export function getExecutableEntry(
  plan: Pick<TradePlan, "plannedEntry">
): number | undefined {
  return plan.plannedEntry;
}

export function getOriginalEntry(
  plan: Pick<TradePlan, "originalEntry" | "plannedEntry">
): number | undefined {
  return plan.originalEntry ?? undefined;
}

/** Seed originalEntry once from the current executable level. Never overwrites. */
export function seedOriginalEntry(
  plan: TradePlan,
  candidate?: number | null
): TradePlan {
  if (plan.originalEntry != null && Number.isFinite(plan.originalEntry)) {
    return plan;
  }
  const fromCandidate =
    candidate != null && Number.isFinite(candidate) ? candidate : undefined;
  const fromExecutable =
    plan.plannedEntry != null && Number.isFinite(plan.plannedEntry)
      ? plan.plannedEntry
      : undefined;
  const value = fromCandidate ?? fromExecutable;
  if (value === undefined) return plan;
  return { ...plan, originalEntry: value };
}

export function parseParticipationBlocker(
  value: unknown
): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

export function parseReviseIf(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0);
  return out.length ? out : undefined;
}

export function parseExecutableEntryAlias(
  proposal: Record<string, unknown>
): number | undefined {
  if (proposal.executableEntry !== undefined) {
    const n = Number(proposal.executableEntry);
    return Number.isFinite(n) ? n : undefined;
  }
  if (proposal.plannedEntry !== undefined) {
    const n = Number(proposal.plannedEntry);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Apply capture fields from a proposal onto a plan draft.
 * - executableEntry/plannedEntry update live geometry
 * - originalEntry only seeds when absent
 * - participationBlocker / reviseIf replace when provided
 */
export function applyScoutCaptureToPlan(
  plan: TradePlan,
  proposal: Record<string, unknown>
): { plan: TradePlan; errors: string[] } {
  const errors: string[] = [];
  let next = { ...plan };

  const blocker = parseParticipationBlocker(proposal.participationBlocker);
  if (proposal.participationBlocker !== undefined) {
    next.participationBlocker = blocker;
  }

  if (proposal.reviseIf !== undefined) {
    if (!Array.isArray(proposal.reviseIf)) {
      errors.push("proposal.reviseIf must be an array of strings");
    } else {
      next.reviseIf = parseReviseIf(proposal.reviseIf);
    }
  }

  // Explicit originalEntry only seeds; never mutates existing.
  if (proposal.originalEntry !== undefined) {
    const n = Number(proposal.originalEntry);
    if (!Number.isFinite(n)) {
      errors.push("proposal.originalEntry must be a number");
    } else if (
      next.originalEntry != null &&
      Number.isFinite(next.originalEntry) &&
      n !== next.originalEntry
    ) {
      errors.push(
        "originalEntry is immutable — cannot change after it was set (update executableEntry/plannedEntry instead)"
      );
    } else {
      next = seedOriginalEntry(next, n);
    }
  }

  const exec = parseExecutableEntryAlias(proposal);
  if (
    proposal.executableEntry !== undefined ||
    proposal.plannedEntry !== undefined
  ) {
    if (exec === undefined) {
      errors.push("proposal.plannedEntry/executableEntry must be a number");
    } else {
      // Seed original from prior executable before revising live entry.
      next = seedOriginalEntry(next, next.plannedEntry);
      next.plannedEntry = exec;
    }
  }

  return { plan: next, errors };
}
