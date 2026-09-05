/**
 * Client-safe T0 repair proposal validation (MXT 029).
 * Must NOT import stores, thesis-case, or Node fs — bridge/ControlPanel use this on the client.
 */

import { isRepairKind, type RepairKind } from "./correction-types";

export type ThesisT0RepairProposal = {
  planId: string;
  repairKind: RepairKind;
  note: string;
  evidenceRefs?: string[];
  /** Decision-time ISO — required for reconstruct; optional override for correct. */
  t0?: string;
  plannedEntry?: number | null;
  stopPrice?: number | null;
  targetPrice?: number | null;
  plannedRR?: number | null;
  executionInstruction?: string | null;
  playbookId?: string | null;
  /** Optional contemporaneous Stock context (not current live Profile). */
  thesisText?: string | null;
  currentHypothesis?: string | null;
};

function numOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function strOrNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || null;
}

export function validateThesisT0RepairProposal(
  proposal: Record<string, unknown>
): { ok: true; value: ThesisT0RepairProposal } | { ok: false; error: string } {
  const planId =
    typeof proposal.planId === "string" ? proposal.planId.trim() : "";
  if (!planId) return { ok: false, error: "planId is required" };
  if (!isRepairKind(proposal.repairKind)) {
    return {
      ok: false,
      error: "repairKind must be reconstructed | corrected",
    };
  }
  const note =
    typeof proposal.note === "string" ? proposal.note.trim() : "";
  if (note.length < 8) {
    return {
      ok: false,
      error: "note required (≥8 chars) — why this repair is legitimate",
    };
  }

  const evidenceRefs = Array.isArray(proposal.evidenceRefs)
    ? proposal.evidenceRefs
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
    : undefined;

  const t0 =
    typeof proposal.t0 === "string" && proposal.t0.trim()
      ? proposal.t0.trim()
      : undefined;
  if (t0 && !Number.isFinite(Date.parse(t0))) {
    return { ok: false, error: "t0 must be a valid ISO timestamp" };
  }

  if (proposal.repairKind === "reconstructed" && !t0) {
    return {
      ok: false,
      error: "reconstructed repair requires t0 (decision-time ISO)",
    };
  }

  const plannedEntry = numOrNull(proposal.plannedEntry);
  const stopPrice = numOrNull(proposal.stopPrice);
  const targetPrice = numOrNull(proposal.targetPrice);
  const plannedRR = numOrNull(proposal.plannedRR);
  if (plannedEntry === undefined && proposal.plannedEntry !== undefined) {
    return { ok: false, error: "plannedEntry must be a finite number or null" };
  }
  if (stopPrice === undefined && proposal.stopPrice !== undefined) {
    return { ok: false, error: "stopPrice must be a finite number or null" };
  }
  if (targetPrice === undefined && proposal.targetPrice !== undefined) {
    return { ok: false, error: "targetPrice must be a finite number or null" };
  }

  if (proposal.repairKind === "reconstructed") {
    if (plannedEntry == null || stopPrice == null || targetPrice == null) {
      return {
        ok: false,
        error:
          "reconstructed repair requires plannedEntry, stopPrice, and targetPrice",
      };
    }
  }

  return {
    ok: true,
    value: {
      planId,
      repairKind: proposal.repairKind,
      note,
      evidenceRefs,
      t0,
      plannedEntry: plannedEntry === undefined ? undefined : plannedEntry,
      stopPrice: stopPrice === undefined ? undefined : stopPrice,
      targetPrice: targetPrice === undefined ? undefined : targetPrice,
      plannedRR: plannedRR === undefined ? undefined : plannedRR,
      executionInstruction: strOrNull(proposal.executionInstruction),
      playbookId: strOrNull(proposal.playbookId),
      thesisText: strOrNull(proposal.thesisText),
      currentHypothesis: strOrNull(proposal.currentHypothesis),
    },
  };
}
