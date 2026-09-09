/**
 * Controlled Plan-specific T0 write/update — server persist path.
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
import {
  validateThesisT0Proposal,
  type ThesisT0Proposal,
} from "./thesis-t0-repair-validate";

export type { ThesisT0Proposal } from "./thesis-t0-repair-validate";
export { validateThesisT0Proposal } from "./thesis-t0-repair-validate";

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
  update: ThesisT0Proposal
): ThesisT0PlanGeometry {
  return {
    ...base,
    plannedEntry:
      update.plannedEntry !== undefined ? update.plannedEntry : base.plannedEntry,
    stopPrice: update.stopPrice !== undefined ? update.stopPrice : base.stopPrice,
    targetPrice:
      update.targetPrice !== undefined ? update.targetPrice : base.targetPrice,
    plannedRR: update.plannedRR !== undefined ? update.plannedRR : base.plannedRR,
    executionInstruction:
      update.executionInstruction !== undefined
        ? update.executionInstruction
        : base.executionInstruction,
    playbookId:
      update.playbookId !== undefined ? update.playbookId : base.playbookId,
    originalEntry: base.originalEntry ?? base.plannedEntry,
  };
}

export type ThesisT0Result = {
  freeze: ThesisT0Freeze;
  created: boolean;
  detachedFromFreezeIds: string[];
};

/**
 * Apply a validated T0 repair for one Plan.
 * Case diagnosis / Insights recompute from the new freeze on next read.
 */
export async function applyThesisT0(input: {
  plan: TradePlan;
  update: ThesisT0Proposal;
  thesis?: StockThesis | null;
}): Promise<ThesisT0Result> {
  if (isMxtReadOnlyMode()) {
    throw new Error("[MXT_READ_ONLY] thesis-t0 blocked");
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

  if (!existing) {
    if (!input.update.t0) {
      throw new Error("t0 is required when the plan has no existing freeze");
    }
    const syntheticPlan: TradePlan = {
      ...input.plan,
      plannedEntry: input.update.plannedEntry ?? input.plan.plannedEntry,
      stopPrice: input.update.stopPrice ?? input.plan.stopPrice,
      targetPrice: input.update.targetPrice ?? input.plan.targetPrice,
      plannedRR: input.update.plannedRR ?? input.plan.plannedRR,
      executionInstruction:
        input.update.executionInstruction ?? input.plan.executionInstruction,
      playbookId: input.update.playbookId ?? input.plan.playbookId,
    };

    let freeze = buildThesisT0Freeze({
      plan: syntheticPlan,
      decision: input.plan.decision ?? null,
      thesis: input.thesis ?? null,
      nowIso: now,
    });
    freeze = {
      ...freeze,
      t0: input.update.t0,
      evaluationHorizonEndsAt: addDaysIso(
        input.update.t0,
        freeze.evaluationHorizonDays || DEFAULT_THESIS_HORIZON_DAYS
      ),
      confidence: input.plan.decision ? freeze.confidence : "partial",
      correctionAudit: [
        {
          at: now,
          kind: "updated",
          note: input.update.note,
          evidenceRefs: input.update.evidenceRefs,
          mechanism: "apply:thesis-t0",
          previous: { missing: true, planId: input.plan.id },
        },
      ],
    };
    if (input.update.thesisText != null || input.update.currentHypothesis != null) {
      freeze = {
        ...freeze,
        stock: {
          ...freeze.stock,
          thesis:
            input.update.thesisText !== undefined
              ? input.update.thesisText
              : freeze.stock.thesis,
          currentHypothesis:
            input.update.currentHypothesis !== undefined
              ? input.update.currentHypothesis
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

  const auditEntry: CorrectionAuditEntry = {
    at: now,
    kind: "updated",
    note: input.update.note,
    evidenceRefs: input.update.evidenceRefs,
    mechanism: "apply:thesis-t0",
    previous: freezeAuditSnapshot(existing),
  };

  const nextPlan = patchPlanGeometry(existing.plan, input.update);
  const nextT0 = input.update.t0 ?? existing.t0;
  let updated: ThesisT0Freeze = {
    ...existing,
    t0: nextT0,
    evaluationHorizonEndsAt: addDaysIso(
      nextT0,
      existing.evaluationHorizonDays || DEFAULT_THESIS_HORIZON_DAYS
    ),
    plan: nextPlan,
    planIds: [input.plan.id],
    supersededFreezeId: existing.id,
    correctionAudit: appendCorrectionAudit(existing.correctionAudit, auditEntry),
    updatedAt: now,
  };

  // New freeze id so audit can distinguish superseded identity if needed;
  // keep same id for stable references — user asked effective value change with audit.
  // Prefer same id: upsert overwrites effective body; previous in audit.
  updated = { ...updated, id: existing.id, supersededFreezeId: null };

  if (input.update.thesisText !== undefined || input.update.currentHypothesis !== undefined) {
    updated = {
      ...updated,
      stock: {
        ...updated.stock,
        thesis:
          input.update.thesisText !== undefined
            ? input.update.thesisText
            : updated.stock.thesis,
        currentHypothesis:
          input.update.currentHypothesis !== undefined
            ? input.update.currentHypothesis
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

export type ThesisT0RepairProposal = ThesisT0Proposal;
export type ThesisT0RepairResult = ThesisT0Result;
export const applyThesisT0Repair = applyThesisT0;
export const validateThesisT0RepairProposal = validateThesisT0Proposal;
