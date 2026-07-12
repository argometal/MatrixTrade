import { computePlannedRR } from "./plan-risk";
import type { PlanStatus, TradePlan } from "./plan-types";
import { getPlans, getPlanById, recordScoutDecision, savePlan } from "./plans";
import type { DecisionVerdict } from "./scout-decision-types";
import {
  authorizeLayeredEntry,
  parseLayeredEntryInput,
} from "./layered-entry";
import {
  createInitialScoutPlan,
  parseInitialScout,
  validateInitialScout,
  type InitialScoutInput,
} from "./stock-case-initial-scout";
import { getStockThesisById } from "./stock-theses";
import { getStockThesesStore } from "./stock-theses-store";
import type { StockThesis } from "./stock-thesis-types";

const ACTIVE_SCOUT_LINK_STATUSES: PlanStatus[] = ["watching", "ready", "entered"];

export const DECISION_TACTICAL_FIELDS = [
  "plannedEntry",
  "stopPrice",
  "targetPrice",
  "minimumRR",
  "thesis",
  "notes",
  "validUntil",
  "status",
  "layeredEntry",
] as const;

export type DecisionTacticalField = (typeof DECISION_TACTICAL_FIELDS)[number];

export function isActiveLinkedScoutPlan(plan: TradePlan, stockThesisId: string): boolean {
  if (plan.stockThesisId?.toUpperCase() !== stockThesisId.toUpperCase()) return false;
  return ACTIVE_SCOUT_LINK_STATUSES.includes(plan.status);
}

export async function getLinkedActiveScoutPlans(stockThesisId: string): Promise<TradePlan[]> {
  const plans = await getPlans();
  return plans.filter((plan) => isActiveLinkedScoutPlan(plan, stockThesisId));
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalIso(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function parsePlanStatus(value: unknown): PlanStatus | undefined {
  const raw = String(value ?? "").trim();
  const allowed: PlanStatus[] = ["watching", "ready", "entered", "skipped", "failed", "expired"];
  return allowed.includes(raw as PlanStatus) ? (raw as PlanStatus) : undefined;
}

function parseVerdict(value: unknown): DecisionVerdict | undefined {
  const raw = String(value ?? "").trim();
  if (raw === "go" || raw === "wait" || raw === "probe" || raw === "no") return raw;
  return undefined;
}

/** Extends initialScout with repair/backfill and tactical correction fields. */
export function parseRepairInitialScout(raw: unknown): InitialScoutInput | undefined {
  const base = parseInitialScout(raw);
  if (!base || !raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const s = raw as Record<string, unknown>;
  return {
    ...base,
    verdict: parseVerdict(s.verdict),
    minimumRR: parseOptionalNumber(s.minimumRR),
    notes: s.notes !== undefined ? String(s.notes).trim() || undefined : undefined,
    status: parsePlanStatus(s.status),
  };
}

export function proposalHasTacticalFields(proposal: Record<string, unknown>): boolean {
  return DECISION_TACTICAL_FIELDS.some((field) => proposal[field] !== undefined);
}

export function proposalHasDecisionMutation(proposal: Record<string, unknown>): boolean {
  const verdict = proposal.verdict;
  const confidence = Number(proposal.decisionConfidence);
  const challenges = proposal.challenges;
  return (
    verdict !== undefined &&
    Number.isFinite(confidence) &&
    Array.isArray(challenges) &&
    challenges.length > 0
  );
}

export async function repairMissingScoutPlan(
  thesis: StockThesis,
  rawInitialScout: unknown
): Promise<{ planId?: string; errors?: string[]; warnings?: string[] }> {
  const scout = parseRepairInitialScout(rawInitialScout);
  if (!scout) {
    return { errors: ["proposal.initialScout must be an object"] };
  }

  const validation = validateInitialScout(scout);
  if (!validation.ok) return { errors: validation.errors };

  const activePlans = await getLinkedActiveScoutPlans(thesis.id);
  if (activePlans.length > 0) {
    return {
      errors: [
        `Stock File ${thesis.id} already has Scout Plan ${activePlans[0].id}. Use decision-update to correct tactical fields instead of creating a duplicate plan.`,
      ],
    };
  }

  const planResult = await createInitialScoutPlan(
    thesis.id,
    thesis.ticker,
    scout,
    thesis.currentHypothesis
  );
  if (planResult.errors?.length) return { errors: planResult.errors };

  const planId = planResult.planId;
  if (!planId) return { errors: ["Failed to create Scout Plan."] };

  const plan = await getPlanById(planId);
  if (!plan) return { errors: ["Created Scout Plan could not be reloaded."] };

  const minimumRR = scout.minimumRR ?? thesis.riskRules.minimumRR;
  if (
    plan.plannedEntry !== undefined &&
    plan.stopPrice !== undefined &&
    plan.targetPrice !== undefined &&
    plan.plannedRR !== undefined &&
    plan.plannedRR < minimumRR
  ) {
    return {
      errors: [
        `Planned R:R ${plan.plannedRR.toFixed(2)} is below minimum ${minimumRR}R for ${thesis.id}.`,
      ],
    };
  }

  const verdict = scout.verdict ?? "wait";
  const decisionResult = await recordScoutDecision(planId, {
    verdict,
    decisionConfidence: 50,
    challenges: ["Scout plan backfilled — confirm capital allocation before go."],
    reasoning: scout.thesis,
    decidedBy: "ai",
  });
  if (decisionResult.errors?.length) return { errors: decisionResult.errors };

  return {
    planId,
    warnings: planResult.warnings,
  };
}

export async function updatePlanTacticsFromProposal(
  proposal: Record<string, unknown>
): Promise<{ plan?: TradePlan; errors?: string[] }> {
  const planId = String(proposal.planId ?? "").trim().toUpperCase();
  if (!planId) return { errors: ["proposal.planId required"] };

  const plan = await getPlanById(planId);
  if (!plan) return { errors: ["Plan not found."] };

  const errors: string[] = [];
  const updated: TradePlan = { ...plan };

  if (proposal.plannedEntry !== undefined) {
    const value = Number(proposal.plannedEntry);
    if (!Number.isFinite(value)) errors.push("proposal.plannedEntry must be a number");
    else updated.plannedEntry = value;
  }
  if (proposal.stopPrice !== undefined) {
    const value = Number(proposal.stopPrice);
    if (!Number.isFinite(value)) errors.push("proposal.stopPrice must be a number");
    else updated.stopPrice = value;
  }
  if (proposal.targetPrice !== undefined) {
    const value = Number(proposal.targetPrice);
    if (!Number.isFinite(value)) errors.push("proposal.targetPrice must be a number");
    else updated.targetPrice = value;
  }
  if (proposal.thesis !== undefined) {
    updated.thesis = String(proposal.thesis).trim() || undefined;
  }
  if (proposal.notes !== undefined) {
    updated.chatNotes = String(proposal.notes).trim() || undefined;
  }
  if (proposal.validUntil !== undefined) {
    updated.validUntil = parseOptionalIso(proposal.validUntil);
  }
  if (proposal.status !== undefined) {
    const status = parsePlanStatus(proposal.status);
    if (!status) errors.push("proposal.status must be watching, ready, entered, skipped, failed, or expired");
    else updated.status = status;
  }
  if (proposal.layeredEntry !== undefined) {
    const layered = parseLayeredEntryInput(proposal.layeredEntry);
    if (!layered) errors.push("proposal.layeredEntry must be a valid layered entry object");
    else {
      updated.layeredEntry = authorizeLayeredEntry(layered);
      updated.executionMethod = layered.executionMethod;
    }
  }

  if (errors.length) return { errors };

  const entry = updated.plannedEntry ?? updated.layeredEntry?.averageEntry;
  if (
    entry !== undefined &&
    updated.stopPrice !== undefined &&
    updated.targetPrice !== undefined
  ) {
    const computed = computePlannedRR(entry, updated.stopPrice, updated.targetPrice);
    if (computed) updated.plannedRR = computed.rr;
  }

  if (proposal.minimumRR !== undefined && plan.stockThesisId) {
    const minimumRR = Number(proposal.minimumRR);
    if (!Number.isFinite(minimumRR) || minimumRR <= 0) {
      return { errors: ["proposal.minimumRR must be a positive number"] };
    }
    const thesis = await getStockThesisById(plan.stockThesisId);
    if (thesis) {
      const now = new Date().toISOString();
      await getStockThesesStore().upsert({
        ...thesis,
        riskRules: { ...thesis.riskRules, minimumRR },
        version: thesis.version + 1,
        updatedAt: now,
      });
      if (updated.plannedRR !== undefined && updated.plannedRR < minimumRR) {
        return {
          errors: [
            `Planned R:R ${updated.plannedRR.toFixed(2)} is below updated minimum ${minimumRR}R.`,
          ],
        };
      }
    }
  }

  updated.updatedAt = new Date().toISOString();
  const { getPlansStore } = await import("./plans-store");
  await getPlansStore().upsert(updated);
  return { plan: updated };
}

export async function applyDecisionUpdateFromProposal(
  proposal: Record<string, unknown>
): Promise<{ plan?: TradePlan; errors?: string[] }> {
  const planId = String(proposal.planId ?? "").trim().toUpperCase();
  if (!planId) return { errors: ["proposal.planId required"] };

  const hasTactical = proposalHasTacticalFields(proposal);
  const hasDecision = proposalHasDecisionMutation(proposal);
  if (!hasTactical && !hasDecision) {
    return {
      errors: [
        "decision-update requires either decision fields (verdict, decisionConfidence, challenges) or at least one tactical field (plannedEntry, stopPrice, targetPrice, minimumRR, thesis, notes, validUntil, status, layeredEntry).",
      ],
    };
  }

  let currentPlan: TradePlan | undefined;
  if (hasTactical) {
    const tacticalResult = await updatePlanTacticsFromProposal(proposal);
    if (tacticalResult.errors?.length) return tacticalResult;
    currentPlan = tacticalResult.plan;
  }

  if (!hasDecision) {
    return { plan: currentPlan ?? (await getPlanById(planId)) };
  }

  const { parseDecisionInput, parseProbeInput } = await import("./scout-decision");
  const input = parseDecisionInput(proposal);
  input.decidedBy = (proposal.decidedBy as typeof input.decidedBy) ?? "ai";
  const probeInput =
    input.verdict === "probe" ? parseProbeInput(proposal.probe) : undefined;
  const layeredEntryInput =
    input.verdict === "go" ? parseLayeredEntryInput(proposal.layeredEntry) : undefined;
  const decisionResult = await recordScoutDecision(
    planId,
    input,
    probeInput,
    layeredEntryInput
  );
  if (decisionResult.errors?.length) return decisionResult;
  return { plan: decisionResult.plan ?? currentPlan };
}
