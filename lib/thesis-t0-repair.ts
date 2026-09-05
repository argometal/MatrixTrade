/**
 * Controlled T0 freeze repair (MXT 029) — server persist path.
 * Validation lives in thesis-t0-repair-validate.ts (client-safe for bridge).
 */

import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import { appendCorrectionAudit, type CorrectionAuditEntry } from "./correction-types";
import {
  addDaysIso,
  buildThesisT0Freeze,
  computeBeliefFingerprint,
  listThesisT0Freezes,
  newThesisT0FreezeId,
} from "./thesis-t0";
import { findFreezeForPlan } from "./thesis-case";
import { getThesisT0Store } from "./thesis-t0-store";
import type {
  ThesisT0Freeze,
  ThesisT0PlanGeometry,
} from "./thesis-t0-types";
import { isMxtReadOnlyMode } from "./mxt-readonly";
import { DEFAULT_THESIS_HORIZON_DAYS } from "./thesis-t0-types";
import type { ThesisT0RepairProposal } from "./thesis-t0-repair-validate";

export type { ThesisT0RepairProposal } from "./thesis-t0-repair-validate";
export { validateThesisT0RepairProposal } from "./thesis-t0-repair-validate";

function freezeAuditSnapshot(f: ThesisT0Freeze): Record<string, unknown> {
  return {
    id: f.id,
    t0: f.t0,
    stockThesisId: f.stockThesisId,
    planIds: [...f.planIds],
    plan: structuredClone(f.plan),
    decision: f.decision ? structuredClone(f.decision) : null,
    stock: structuredClone(f.stock),
    confidence: f.confidence,
    beliefFingerprint: f.beliefFingerprint,
    recordKind: f.recordKind ?? "original",
    status: f.status,
  };
}

function patchPlanGeometry(
  base: ThesisT0PlanGeometry,
  repair: ThesisT0RepairProposal
): ThesisT0PlanGeometry {
  return {
    ...base,
    plannedEntry:
      repair.plannedEntry !== undefined ? repair.plannedEntry : base.plannedEntry,
    stopPrice: repair.stopPrice !== undefined ? repair.stopPrice : base.stopPrice,
    targetPrice:
      repair.targetPrice !== undefined ? repair.targetPrice : base.targetPrice,
    plannedRR: repair.plannedRR !== undefined ? repair.plannedRR : base.plannedRR,
    executionInstruction:
      repair.executionInstruction !== undefined
        ? repair.executionInstruction
        : base.executionInstruction,
    playbookId:
      repair.playbookId !== undefined ? repair.playbookId : base.playbookId,
    originalEntry: base.originalEntry ?? base.plannedEntry,
  };
}

export type ThesisT0RepairResult = {
  freeze: ThesisT0Freeze;
  created: boolean;
  detachedFromFreezeIds: string[];
};

/**
 * Apply a validated T0 repair for one Plan.
 * Case diagnosis / Insights recompute from the new freeze on next read.
 */
export async function applyThesisT0Repair(input: {
  plan: TradePlan;
  repair: ThesisT0RepairProposal;
  thesis?: StockThesis | null;
}): Promise<ThesisT0RepairResult> {
  if (isMxtReadOnlyMode()) {
    throw new Error("[MXT_READ_ONLY] thesis-t0-repair blocked");
  }
  const store = getThesisT0Store();
  const now = new Date().toISOString();
  const freezes = await listThesisT0Freezes();
  const planKey = input.plan.id.toUpperCase();
  const detachedFromFreezeIds: string[] = [];

  // Detach this plan from any foreign freeze planIds.
  for (const row of freezes) {
    if (row.plan.planId.toUpperCase() === planKey) continue;
    if (!row.planIds.some((id) => id.toUpperCase() === planKey)) continue;
    detachedFromFreezeIds.push(row.id);
    await store.upsert({
      ...row,
      planIds: row.planIds.filter((id) => id.toUpperCase() !== planKey),
      updatedAt: now,
    });
  }

  const existing = findFreezeForPlan(input.plan, await listThesisT0Freezes());

  if (input.repair.repairKind === "reconstructed") {
    if (existing) {
      throw new Error(
        "Plan already has a T0 freeze — use repairKind=corrected, not reconstructed"
      );
    }
    if (!input.repair.t0) {
      throw new Error("reconstructed repair requires t0");
    }

    // Prefer plan decision if present; geometry from repair + plan.
    const syntheticPlan: TradePlan = {
      ...input.plan,
      plannedEntry: input.repair.plannedEntry ?? input.plan.plannedEntry,
      stopPrice: input.repair.stopPrice ?? input.plan.stopPrice,
      targetPrice: input.repair.targetPrice ?? input.plan.targetPrice,
      plannedRR: input.repair.plannedRR ?? input.plan.plannedRR,
      executionInstruction:
        input.repair.executionInstruction ?? input.plan.executionInstruction,
      playbookId: input.repair.playbookId ?? input.plan.playbookId,
    };

    let freeze = buildThesisT0Freeze({
      plan: syntheticPlan,
      decision: input.plan.decision ?? null,
      thesis: input.thesis ?? null,
      nowIso: now,
    });
    freeze = {
      ...freeze,
      t0: input.repair.t0,
      evaluationHorizonEndsAt: addDaysIso(
        input.repair.t0,
        freeze.evaluationHorizonDays || DEFAULT_THESIS_HORIZON_DAYS
      ),
      recordKind: "reconstructed",
      confidence: input.plan.decision ? "partial" : "partial",
      correctionAudit: [
        {
          at: now,
          kind: "reconstructed",
          note: input.repair.note,
          evidenceRefs: input.repair.evidenceRefs,
          mechanism: "apply:thesis-t0-repair",
          previous: { missing: true, planId: input.plan.id },
        },
      ],
    };
    if (input.repair.thesisText != null || input.repair.currentHypothesis != null) {
      freeze = {
        ...freeze,
        stock: {
          ...freeze.stock,
          thesis:
            input.repair.thesisText !== undefined
              ? input.repair.thesisText
              : freeze.stock.thesis,
          currentHypothesis:
            input.repair.currentHypothesis !== undefined
              ? input.repair.currentHypothesis
              : freeze.stock.currentHypothesis,
        },
      };
      if (freeze.stock.thesis && freeze.stock.currentHypothesis) {
        freeze = {
          ...freeze,
          beliefFingerprint: computeBeliefFingerprint({
            thesis: freeze.stock.thesis,
            currentHypothesis: freeze.stock.currentHypothesis,
            levels: freeze.stock.levels,
            riskRules: freeze.stock.riskRules,
          }),
        };
      }
    }
    await store.insert(freeze);
    return { freeze, created: true, detachedFromFreezeIds };
  }

  // corrected
  if (!existing) {
    throw new Error(
      "No T0 freeze to correct — use repairKind=reconstructed when Missing T0"
    );
  }

  const auditEntry: CorrectionAuditEntry = {
    at: now,
    kind: "corrected",
    note: input.repair.note,
    evidenceRefs: input.repair.evidenceRefs,
    mechanism: "apply:thesis-t0-repair",
    previous: freezeAuditSnapshot(existing),
  };

  const nextPlan = patchPlanGeometry(existing.plan, input.repair);
  const nextT0 = input.repair.t0 ?? existing.t0;
  let updated: ThesisT0Freeze = {
    ...existing,
    t0: nextT0,
    evaluationHorizonEndsAt: addDaysIso(
      nextT0,
      existing.evaluationHorizonDays || DEFAULT_THESIS_HORIZON_DAYS
    ),
    plan: nextPlan,
    planIds: [input.plan.id],
    recordKind: "corrected",
    supersededFreezeId: existing.id,
    correctionAudit: appendCorrectionAudit(existing.correctionAudit, auditEntry),
    updatedAt: now,
  };

  // New freeze id so audit can distinguish superseded identity if needed;
  // keep same id for stable references — user asked effective value change with audit.
  // Prefer same id: upsert overwrites effective body; previous in audit.
  updated = { ...updated, id: existing.id, supersededFreezeId: null };

  if (input.repair.thesisText !== undefined || input.repair.currentHypothesis !== undefined) {
    updated = {
      ...updated,
      stock: {
        ...updated.stock,
        thesis:
          input.repair.thesisText !== undefined
            ? input.repair.thesisText
            : updated.stock.thesis,
        currentHypothesis:
          input.repair.currentHypothesis !== undefined
            ? input.repair.currentHypothesis
            : updated.stock.currentHypothesis,
      },
    };
  }

  await store.upsert(updated);
  return { freeze: updated, created: false, detachedFromFreezeIds };
}

/** Unused helper kept for clarity — new ids reserved if supersession model expands. */
export function allocateSupersedingFreezeId(): string {
  return newThesisT0FreezeId();
}
