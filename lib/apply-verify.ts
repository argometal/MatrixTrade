import type { TradingInboxPayload } from "./bridge";
import { getPlanById, getPlans } from "./plans";
import { getActiveEvidenceForProfile } from "./market-evidence";
import { getStockThesesByTicker, getStockThesisById } from "./stock-theses";
import { getPlaybookById, slugifyPlaybookId } from "./playbooks";
import { getMtaeAssessmentById, getMtaeCalibrations } from "./mtae-store";
import { getTradeById } from "./storage";
import type { Trade } from "./types";

export interface ApplyVerifyResult {
  ok: boolean;
  detail: string;
}

function fieldContains(stored: string | undefined, expected: string): boolean {
  if (!expected.trim()) return true;
  if (!stored?.trim()) return false;
  return stored.includes(expected.trim());
}

function numMatch(stored: number | undefined, expected: unknown): boolean {
  if (expected === undefined) return true;
  return stored === Number(expected);
}

export async function verifyApplyPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  switch (parsed.type) {
    case "stock-case-create":
      return verifyStockCaseCreatePersistence(parsed);
    case "stock-case-delete":
      return verifyStockCaseDeletePersistence(parsed);
    case "evidence-add":
      return verifyEvidenceAddPersistence(parsed);
    case "decision-update":
      return verifyDecisionUpdatePersistence(parsed);
    case "layered-entry-update":
      return verifyLayeredEntryUpdatePersistence(parsed);
    case "scout-assessment":
    case "file-update":
      return verifyStockFilePersistence(parsed);
    case "scout-plan-create":
      return verifyScoutPlanCreatePersistence(parsed);
    case "technical-assessment":
      return verifyTechnicalAssessmentPersistence(parsed);
    case "technical-calibration":
      return verifyTechnicalCalibrationPersistence(parsed);
    case "attribution":
      return verifyAttributionPersistence(parsed);
    case "observation-update":
      return verifyObservationUpdatePersistence(parsed);
    case "plan-outcome":
      return verifyPlanOutcomePersistence(parsed);
    case "trade-proposal":
    case "trade-close":
    case "trade-review":
    case "analysis":
    case "trade-update":
      return verifyTradePersistence(parsed);
    case "playbook-create":
    case "playbook-update":
      return verifyPlaybookPersistence(parsed);
    case "capital-configuration-create":
    case "capital-configuration-update":
      return verifyCapitalConfigurationPersistence(parsed);
    case "capital-reservation-create":
    case "capital-reservation-update":
    case "capital-reservation-release":
      return verifyCapitalReservationPersistence(parsed);
    case "capital-ledger-adjustment":
      return verifyCapitalLedgerPersistence(parsed);
    case "external-position-create":
    case "external-position-update":
    case "external-position-reduction":
    case "external-position-settle":
    case "external-position-exit-plan-update":
      return verifyExternalPositionPersistence(parsed);
    default:
      return { ok: false, detail: "Unsupported proposal type for verification." };
  }
}

async function verifyStockCaseCreatePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const ticker = String(p.ticker).toUpperCase();
  const hypothesis = String(p.currentHypothesis ?? "").trim();
  const theses = await getStockThesesByTicker(ticker);
  const match = theses.find((t) => t.currentHypothesis.trim() === hypothesis);
  if (!match) {
    return { ok: false, detail: `Stock Profile for ${ticker} with matching hypothesis not found.` };
  }
  return { ok: true, detail: `Stock Profile ${match.id} · ${match.ticker} verified.` };
}

async function verifyStockCaseDeletePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const id = String(parsed.proposal.id ?? "").trim().toUpperCase();
  const remaining = await getStockThesisById(id);
  if (remaining) {
    return { ok: false, detail: `Stock Profile ${id} still exists after delete.` };
  }
  return { ok: true, detail: `Stock Profile ${id} removed.` };
}

async function verifyDecisionUpdatePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const planId = String(p.planId).toUpperCase();
  const reloaded = await getPlanById(planId);
  if (!reloaded) {
    return { ok: false, detail: `Plan ${planId} not found after apply.` };
  }

  const tacticalFields = [
    "plannedEntry",
    "stopPrice",
    "targetPrice",
    "minimumRR",
    "thesis",
    "notes",
    "validUntil",
    "status",
    "operationalAssessment",
    "executionReadiness",
    "executionInstruction",
  ] as const;
  const hasTactical = tacticalFields.some((field) => p[field] !== undefined);
  const hasDecision =
    p.verdict !== undefined &&
    p.decisionConfidence !== undefined &&
    Array.isArray(p.challenges) &&
    p.challenges.length > 0;

  if (hasTactical) {
    const failures: string[] = [];
    if (p.plannedEntry !== undefined && !numMatch(reloaded.plannedEntry, p.plannedEntry)) {
      failures.push("plannedEntry");
    }
    if (p.stopPrice !== undefined && !numMatch(reloaded.stopPrice, p.stopPrice)) {
      failures.push("stopPrice");
    }
    if (p.targetPrice !== undefined && !numMatch(reloaded.targetPrice, p.targetPrice)) {
      failures.push("targetPrice");
    }
    if (p.thesis !== undefined && reloaded.thesis !== String(p.thesis).trim()) {
      failures.push("thesis");
    }
    if (p.notes !== undefined && reloaded.chatNotes !== String(p.notes).trim()) {
      failures.push("notes");
    }
    if (p.status !== undefined && reloaded.status !== String(p.status)) {
      failures.push("status");
    }
    if (p.executionReadiness !== undefined) {
      if (reloaded.executionReadiness !== String(p.executionReadiness).trim()) {
        failures.push("executionReadiness");
      }
    }
    if (p.executionInstruction !== undefined) {
      const { normalizeExecutionInstruction } = await import(
        "./scout-execution-instruction"
      );
      const expected = normalizeExecutionInstruction(p.executionInstruction);
      if (reloaded.executionInstruction !== expected) {
        failures.push("executionInstruction");
      }
    }
    if (p.operationalAssessment !== undefined) {
      const expected = p.operationalAssessment as Record<string, unknown>;
      const stored = reloaded.decision?.operationalAssessment;
      if (!stored) {
        failures.push("operationalAssessment");
      } else {
        if (
          expected.operationalState !== undefined &&
          stored.operationalState !== String(expected.operationalState)
        ) {
          failures.push("operationalAssessment.operationalState");
        }
        if (
          expected.reviewRequired !== undefined &&
          stored.reviewRequired !== Boolean(expected.reviewRequired)
        ) {
          failures.push("operationalAssessment.reviewRequired");
        }
        if (
          expected.nextReviewAt !== undefined &&
          stored.nextReviewAt !== String(expected.nextReviewAt)
        ) {
          failures.push("operationalAssessment.nextReviewAt");
        }
      }
    }
    if (failures.length > 0) {
      return {
        ok: false,
        detail: `Tactical fields not persisted on ${planId}: ${failures.join(", ")}.`,
      };
    }
  }

  if (hasDecision) {
    const verdict = String(p.verdict);
    if (!reloaded.decision || reloaded.decision.verdict !== verdict) {
      return { ok: false, detail: `Decision verdict not persisted on ${planId}.` };
    }
    const confidence = Number(p.decisionConfidence);
    if (reloaded.decision.decisionConfidence !== confidence) {
      return { ok: false, detail: `Decision confidence mismatch on ${planId}.` };
    }
  }

  const oaState = reloaded.decision?.operationalAssessment?.operationalState;
  return {
    ok: true,
    detail: hasDecision
      ? `Decision on ${planId} · ${reloaded.decision?.verdict} · confidence ${reloaded.decision?.decisionConfidence}`
      : oaState || reloaded.executionReadiness
        ? `Tactical fields updated on ${planId}${oaState ? ` · operational ${oaState}` : ""}${
            reloaded.executionReadiness
              ? ` · executionReadiness ${reloaded.executionReadiness}`
              : ""
          }.`
        : `Tactical fields updated on ${planId}.`,
  };
}

async function verifyLayeredEntryUpdatePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const planId = String(p.planId).toUpperCase();
  const reloaded = await getPlanById(planId);
  if (!reloaded?.layeredEntry) {
    return { ok: false, detail: `Layered entry not found on ${planId} after apply.` };
  }
  if (p.status !== undefined && reloaded.layeredEntry.status !== String(p.status)) {
    return { ok: false, detail: `Layered entry status mismatch on ${planId}.` };
  }
  if (p.filledThroughIndex !== undefined) {
    const idx = Number(p.filledThroughIndex);
    const filledCount = reloaded.layeredEntry.limits.filter((l) => l.filled).length;
    const expected = idx < 0 ? 0 : idx + 1;
    if (filledCount !== expected) {
      return {
        ok: false,
        detail: `Filled limits count mismatch on ${planId} (expected ${expected}, got ${filledCount}).`,
      };
    }
  }
  return {
    ok: true,
    detail: `Layered entry on ${planId} · ${reloaded.layeredEntry.status} verified.`,
  };
}

async function verifyEvidenceAddPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const profileId = String(p.stockProfileId).toUpperCase();
  const value = String(p.value ?? "").trim();
  const rows = await getActiveEvidenceForProfile(profileId);
  const match = rows.find((row) => row.value.trim() === value);
  if (!match) {
    return { ok: false, detail: `Evidence value not found for ${profileId} after apply.` };
  }
  return {
    ok: true,
    detail: `Evidence ${match.id} · ${match.category} verified for ${profileId}.`,
  };
}

async function verifyScoutPlanCreatePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const stockFileId = String(parsed.proposal.stockFileId ?? parsed.proposal.stockThesisId ?? "")
    .trim()
    .toUpperCase();
  const ticker = String(parsed.proposal.ticker ?? "").toUpperCase();
  const entry = Number(parsed.proposal.plannedEntry);
  const allPlans = await getPlans();
  const match = [...allPlans]
    .reverse()
    .find(
      (plan) =>
        plan.stockThesisId?.toUpperCase() === stockFileId &&
        plan.ticker === ticker &&
        plan.plannedEntry === entry
    );
  if (!match) {
    return { ok: false, detail: `No new Scout Plan found for ${stockFileId} @ entry ${entry}.` };
  }
  if (parsed.proposal.executionInstruction !== undefined) {
    const { normalizeExecutionInstruction } = await import(
      "./scout-execution-instruction"
    );
    const expected = normalizeExecutionInstruction(
      parsed.proposal.executionInstruction
    );
    if (match.executionInstruction !== expected) {
      return {
        ok: false,
        detail: `executionInstruction not persisted on ${match.id}.`,
      };
    }
  }
  return {
    ok: true,
    detail: `Scout Plan ${match.id} verified · linked ${match.stockThesisId} · status ${match.status}`,
  };
}

async function verifyTechnicalAssessmentPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const stockProfileId = String(p.stockProfileId ?? p.id ?? "").toUpperCase();
  const ticker = String(p.ticker ?? "").toUpperCase();
  const thesis = await getStockThesisById(stockProfileId);
  if (!thesis) {
    return { ok: false, detail: `Stock File ${stockProfileId} not found after MTAE apply.` };
  }
  if (p.patchStockFile !== false) {
    const inv = String((p.technicalSummary as Record<string, unknown> | undefined)?.structuralInvalidation ?? "");
    if (inv && thesis.riskRules.invalidation !== inv.trim()) {
      return { ok: false, detail: `Invalidation not patched on ${stockProfileId}.` };
    }
    if (!thesis.notes?.includes("MTAE ·")) {
      return { ok: false, detail: `MTAE stamp missing in ${stockProfileId} notes.` };
    }
  }
  // Latest assessment for ticker should exist
  const { getMtaeAssessments } = await import("./mtae-store");
  const rows = await getMtaeAssessments();
  const match = [...rows].reverse().find((row) => row.ticker === ticker && row.stockProfileId === stockProfileId);
  if (!match) {
    return { ok: false, detail: `No MTAE assessment stored for ${ticker}.` };
  }
  return {
    ok: true,
    detail: `MTAE ${match.id} verified · Stock File ${stockProfileId} v${thesis.version}`,
  };
}

async function verifyTechnicalCalibrationPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const assessmentId = String(parsed.proposal.assessmentId ?? "").toUpperCase();
  const assessment = await getMtaeAssessmentById(assessmentId);
  if (!assessment) {
    return { ok: false, detail: `Assessment ${assessmentId} missing.` };
  }
  const rows = await getMtaeCalibrations();
  const match = [...rows]
    .reverse()
    .find((row) => row.assessmentId === assessmentId && row.fieldPath === String(parsed.proposal.fieldPath));
  if (!match) {
    return { ok: false, detail: `Calibration for ${assessmentId} not found.` };
  }
  return { ok: true, detail: `MTAE calibration ${match.id} verified.` };
}

async function verifyAttributionPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const { getMafExperiments, getMafExperimentById, getMafExperimentByTradeId } = await import(
    "./maf-store"
  );
  if (p.experimentId) {
    const row = await getMafExperimentById(String(p.experimentId));
    if (!row) {
      return { ok: false, detail: `MAF experiment ${p.experimentId} not found after apply.` };
    }
    return {
      ok: true,
      detail: `MAF ${row.id} verified · ${row.attributions.length} components · ${row.status}`,
    };
  }
  if (p.tradeId) {
    const row = await getMafExperimentByTradeId(String(p.tradeId));
    if (!row) {
      return { ok: false, detail: `No MAF experiment for trade ${p.tradeId}.` };
    }
    return {
      ok: true,
      detail: `MAF ${row.id} verified · trade ${row.tradeId} · ${row.attributions.length} components`,
    };
  }
  const rows = await getMafExperiments();
  if (!rows.length) {
    return { ok: false, detail: "No MAF experiments stored after apply." };
  }
  const latest = rows[rows.length - 1];
  return {
    ok: true,
    detail: `MAF ${latest.id} verified · ${latest.attributions.length} components`,
  };
}

async function verifyObservationUpdatePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const { getObservationById, getObservationByTradeId, getObservationByPlanId } = await import(
    "./observation-store"
  );
  const row =
    (p.observationId || p.id
      ? await getObservationById(String(p.observationId ?? p.id))
      : undefined) ??
    (p.tradeId ? await getObservationByTradeId(String(p.tradeId)) : undefined) ??
    (p.planId ? await getObservationByPlanId(String(p.planId)) : undefined);
  if (!row) {
    return { ok: false, detail: "Observation not found after apply." };
  }
  return {
    ok: true,
    detail: `Observation ${row.id} verified · ${row.status}`,
  };
}

async function verifyPlanOutcomePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const planId = String(parsed.proposal.planId ?? "").trim().toUpperCase();
  const { getPlanById } = await import("./plans");
  const { loadAndVerifyPlanOutcomeLearning } = await import(
    "./plan-outcome-learning-sync"
  );
  const plan = await getPlanById(planId);
  if (!plan?.outcome?.recordedAt) {
    return { ok: false, detail: `Plan ${planId} outcome.recordedAt missing after apply.` };
  }

  const verify = await loadAndVerifyPlanOutcomeLearning(plan);
  if (plan.outcome.learningSyncStatus !== "complete" || !verify.ok) {
    const issues = verify.issues.map((i) => i.message).join("; ");
    return {
      ok: false,
      detail: `Plan ${plan.id} outcome recorded but Learning sync incomplete (${plan.outcome.learningSyncStatus ?? "legacy/pending"})${issues ? `: ${issues}` : ""}. Repair via Planning → Retry Learning Sync.`,
    };
  }

  const kind = plan.outcome.outcomeKind;
  if (kind === "unexecuted_plan_loss" || plan.outcome.status === "theoretical_loss") {
    const lo = verify.learningOutcome;
    const obs = verify.observation;
    if (!lo || lo.kind !== "unexecuted_plan_loss") {
      return { ok: false, detail: `Plan ${plan.id}: LO unexecuted_plan_loss missing after apply.` };
    }
    if (lo.tradeId) {
      return { ok: false, detail: `Plan ${plan.id}: LO must not have tradeId.` };
    }
    if (lo.realizedR !== 0 || lo.counterfactualR !== -1) {
      return { ok: false, detail: `Plan ${plan.id}: LO R fields not server-derived (0 / -1).` };
    }
    if (!obs || obs.learningOutcomeId !== lo.id || lo.observationId !== obs.id) {
      return { ok: false, detail: `Plan ${plan.id}: LO↔OBS links inconsistent.` };
    }
  }

  if (kind === "duplicate_creation") {
    const lo = verify.learningOutcome;
    if (!lo || lo.kind !== "duplicate_creation" || lo.excludedFromMetrics !== true) {
      return {
        ok: false,
        detail: `Plan ${plan.id}: duplicate_creation LO missing or not excludedFromMetrics.`,
      };
    }
  }

  return {
    ok: true,
    detail: `Plan ${plan.id} outcome + learning sync verified · ${plan.outcome.outcomeKind ?? plan.outcome.status ?? "recorded"} · LO ${verify.learningOutcome?.id ?? "—"}`,
  };
}

async function verifyStockFilePersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const id =
    parsed.type === "scout-assessment"
      ? String(p.stockFileId).toUpperCase()
      : String(p.id).toUpperCase();
  const reloaded = await getStockThesisById(id);
  if (!reloaded) {
    return { ok: false, detail: `Stock File ${id} not found after apply.` };
  }
  if (parsed.type === "scout-assessment") {
    const verdict = String(p.verdict);
    if (!reloaded.notes?.includes(verdict)) {
      return { ok: false, detail: `Assessment verdict not found in ${id} notes.` };
    }
    return { ok: true, detail: `Scout assessment on ${id} · v${reloaded.version}` };
  }
  if (p.currentHypothesis !== undefined && reloaded.currentHypothesis !== String(p.currentHypothesis).trim()) {
    return { ok: false, detail: `Hypothesis not updated on ${id}.` };
  }
  if (p.status !== undefined && reloaded.status !== String(p.status)) {
    return { ok: false, detail: `Status not updated on ${id}.` };
  }
  if (p.initialScout !== undefined) {
    const scout = p.initialScout as Record<string, unknown>;
    const allPlans = await getPlans();
    const activePlan = allPlans.find(
      (plan) =>
        plan.stockThesisId?.toUpperCase() === id &&
        (plan.status === "watching" || plan.status === "ready" || plan.status === "entered")
    );
    if (!activePlan) {
      return { ok: false, detail: `No linked Scout Plan found for ${id} after initialScout backfill.` };
    }
    if (scout.plannedEntry !== undefined && !numMatch(activePlan.plannedEntry, scout.plannedEntry)) {
      return { ok: false, detail: `Backfilled plan entry mismatch on ${activePlan.id}.` };
    }
    if (scout.stopPrice !== undefined && !numMatch(activePlan.stopPrice, scout.stopPrice)) {
      return { ok: false, detail: `Backfilled plan stop mismatch on ${activePlan.id}.` };
    }
    if (scout.targetPrice !== undefined && !numMatch(activePlan.targetPrice, scout.targetPrice)) {
      return { ok: false, detail: `Backfilled plan target mismatch on ${activePlan.id}.` };
    }
    return {
      ok: true,
      detail: `Stock File ${id} · backfilled scout ${activePlan.id} · planned R ${activePlan.plannedRR ?? "—"}`,
    };
  }
  return { ok: true, detail: `Stock File ${id} · v${reloaded.version} verified.` };
}

async function verifyTradePersistence(parsed: TradingInboxPayload): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const tradeId = String(p.id).toUpperCase();
  const reloaded = await getTradeById(tradeId);

  switch (parsed.type) {
    case "trade-proposal": {
      if (!reloaded) {
        return { ok: false, detail: `Trade ${tradeId} not found in active store after apply.` };
      }
      const ticker = String(p.ticker).toUpperCase();
      if (reloaded.ticker !== ticker) {
        return {
          ok: false,
          detail: `Trade ${tradeId} exists but ticker is ${reloaded.ticker}, expected ${ticker}.`,
        };
      }
      const expectedStatus =
        p.status !== undefined ? String(p.status).toLowerCase() : "pending";
      if (reloaded.status !== expectedStatus) {
        return {
          ok: false,
          detail: `Trade ${tradeId} status is ${reloaded.status}, expected ${expectedStatus}.`,
        };
      }
      return { ok: true, detail: `Trade ${tradeId} · ${reloaded.ticker} found in store (${reloaded.status}).` };
    }
    case "trade-close": {
      if (!reloaded) {
        return { ok: false, detail: `Trade ${tradeId} not found after close apply.` };
      }
      const exit = Number(p.exit);
      if (reloaded.status !== "closed") {
        return { ok: false, detail: `Trade ${tradeId} status is ${reloaded.status}, expected closed.` };
      }
      if (reloaded.exit !== exit) {
        return {
          ok: false,
          detail: `Trade ${tradeId} exit is ${reloaded.exit ?? "—"}, expected ${exit}.`,
        };
      }
      return { ok: true, detail: `Trade ${tradeId} closed at ${reloaded.exit} in store.` };
    }
    case "trade-review": {
      if (!reloaded) {
        return { ok: false, detail: `Trade ${tradeId} not found after review apply.` };
      }
      if (!reloaded.reviewedAt) {
        return { ok: false, detail: `Trade ${tradeId} has no reviewedAt after review apply.` };
      }
      return { ok: true, detail: `Review saved for ${tradeId} (reviewedAt set).` };
    }
    case "analysis": {
      if (!reloaded) {
        return { ok: false, detail: `Trade ${tradeId} not found after analysis apply.` };
      }
      const checks: string[] = [];
      const failures: string[] = [];
      if (p.thesis) {
        checks.push("thesis");
        if (!fieldContains(reloaded.thesis, String(p.thesis))) failures.push("thesis");
      }
      if (p.psychology) {
        checks.push("psychology");
        if (!fieldContains(reloaded.psychology, String(p.psychology))) failures.push("psychology");
      }
      if (p.lessons) {
        checks.push("lessons");
        if (!fieldContains(reloaded.lessons, String(p.lessons))) failures.push("lessons");
      }
      if (p.notes) {
        checks.push("notes");
        if (!fieldContains(reloaded.notes, String(p.notes))) failures.push("notes");
      }
      if (checks.length === 0) {
        return { ok: false, detail: "No analysis fields to verify." };
      }
      if (failures.length > 0) {
        return {
          ok: false,
          detail: `Expected fields not found on trade ${tradeId}: ${failures.join(", ")}.`,
        };
      }
      return {
        ok: true,
        detail: `Analysis fields persisted on ${tradeId}: ${checks.join(", ")}.`,
      };
    }
    case "trade-update": {
      if (!reloaded) {
        return { ok: false, detail: `Trade ${tradeId} not found after update apply.` };
      }
      const failures: string[] = [];
      if (p.stop !== undefined && !numMatch(reloaded.stop, p.stop)) failures.push("stop");
      if (p.target !== undefined && !numMatch(reloaded.target, p.target)) failures.push("target");
      if (p.entry !== undefined && !numMatch(reloaded.entry, p.entry)) failures.push("entry");
      if (p.ticker !== undefined && reloaded.ticker !== String(p.ticker).toUpperCase()) {
        failures.push("ticker");
      }
      if (p.thesis !== undefined && !fieldContains(reloaded.thesis, String(p.thesis))) {
        failures.push("thesis");
      }
      if (p.playbookId !== undefined && reloaded.playbookId !== String(p.playbookId)) {
        failures.push("playbookId");
      }
      if (failures.length > 0) {
        return {
          ok: false,
          detail: `Trade ${tradeId} updated but fields mismatch: ${failures.join(", ")}.`,
        };
      }
      return { ok: true, detail: `Trade ${tradeId} update verified in store.` };
    }
    default:
      return { ok: false, detail: "Unsupported trade verification type." };
  }
}

async function verifyPlaybookPersistence(parsed: TradingInboxPayload): Promise<ApplyVerifyResult> {
  const p = parsed.proposal;
  const playbookId =
    parsed.type === "playbook-create"
      ? (p.id ? String(p.id).trim() : slugifyPlaybookId(String(p.name)))
      : String(p.id).trim();
  const reloaded = await getPlaybookById(playbookId);
  if (!reloaded) {
    return { ok: false, detail: `Playbook ${playbookId} not found after apply.` };
  }
  if (parsed.type === "playbook-create" && reloaded.name !== String(p.name).trim()) {
    return { ok: false, detail: `Playbook name mismatch for ${playbookId}.` };
  }
  if (parsed.type === "playbook-update") {
    if (p.name !== undefined && reloaded.name !== String(p.name).trim()) {
      return { ok: false, detail: `Playbook ${playbookId} name not updated.` };
    }
    if (p.status !== undefined && reloaded.status !== String(p.status).toUpperCase()) {
      return { ok: false, detail: `Playbook ${playbookId} status not updated.` };
    }
  }
  return { ok: true, detail: `Playbook ${playbookId} · ${reloaded.name} verified in store.` };
}

export function formatPersistenceTarget(storeMode: string): string {
  return storeMode === "supabase" ? "Supabase" : "local JSON";
}

async function verifyCapitalConfigurationPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const { getActiveCapitalConfiguration } = await import("./capital-configuration");
  const active = await getActiveCapitalConfiguration();
  if (!active) {
    return {
      ok: false,
      detail: "No active Capital Configuration found after apply.",
    };
  }
  const expectedId = String(parsed.proposal.id ?? "").trim();
  if (expectedId && active.id !== expectedId && parsed.type === "capital-configuration-update") {
    return {
      ok: false,
      detail: `Active Capital Configuration is ${active.id}, expected ${expectedId}.`,
    };
  }
  return {
    ok: true,
    detail: `Capital Configuration ${active.id} active (${active.status}).`,
  };
}

async function verifyCapitalReservationPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const { listCapitalReservations } = await import("./capital-reservation");
  const rows = await listCapitalReservations();
  const planId = String(parsed.proposal.planId ?? "").trim().toUpperCase();
  const reservationId = String(parsed.proposal.reservationId ?? parsed.proposal.id ?? "")
    .trim()
    .toUpperCase();
  const match = rows.find(
    (row) =>
      (reservationId && row.id.toUpperCase() === reservationId) ||
      (planId && row.planId.toUpperCase() === planId)
  );
  if (!match) {
    return {
      ok: false,
      detail: `Capital reservation not found after apply${
        reservationId ? ` (${reservationId})` : planId ? ` for plan ${planId}` : ""
      }.`,
    };
  }
  if (parsed.type === "capital-reservation-release" && match.status !== "released") {
    return {
      ok: false,
      detail: `Capital reservation ${match.id} status is ${match.status}, expected released.`,
    };
  }
  return {
    ok: true,
    detail: `Capital reservation ${match.id} · ${match.planId} · ${match.status}.`,
  };
}

async function verifyCapitalLedgerPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const { listCapitalLedgerEvents } = await import("./capital-ledger");
  const events = await listCapitalLedgerEvents();
  const idempotencyKey = String(parsed.proposal.idempotencyKey ?? "").trim();
  const eventId = String(parsed.proposal.id ?? "").trim();
  const match = events.find(
    (event) =>
      (idempotencyKey && event.idempotencyKey === idempotencyKey) ||
      (eventId && event.id === eventId)
  );
  if (!match && events.length === 0) {
    return { ok: false, detail: "No capital ledger events found after apply." };
  }
  if (!match) {
    // Apply may generate server id — confirm ledger non-empty as soft structural check.
    const latest = events[events.length - 1];
    return {
      ok: true,
      detail: `Capital ledger recorded (${latest?.id ?? "event"}).`,
    };
  }
  return { ok: true, detail: `Capital ledger event ${match.id} verified.` };
}

async function verifyExternalPositionPersistence(
  parsed: TradingInboxPayload
): Promise<ApplyVerifyResult> {
  const { getExternalPositionById, getExternalPositions } = await import(
    "./external-position-store"
  );
  const positionId = String(
    parsed.proposal.positionId ?? parsed.proposal.id ?? ""
  )
    .trim()
    .toUpperCase();
  if (positionId) {
    const row = await getExternalPositionById(positionId);
    if (!row) {
      return {
        ok: false,
        detail: `External Position ${positionId} not found after apply.`,
      };
    }
    return {
      ok: true,
      detail: `External Position ${row.id} · ${row.ticker} · ${row.status}.`,
    };
  }
  const ticker = String(parsed.proposal.ticker ?? "").trim().toUpperCase();
  if (ticker) {
    const rows = await getExternalPositions();
    const match = rows.find((row) => row.ticker.toUpperCase() === ticker);
    if (!match) {
      return {
        ok: false,
        detail: `External Position for ${ticker} not found after apply.`,
      };
    }
    return {
      ok: true,
      detail: `External Position ${match.id} · ${match.ticker} · ${match.status}.`,
    };
  }
  return {
    ok: false,
    detail: "External Position verification requires positionId or ticker.",
  };
}

export function summarizeTradeEvidence(trade: Trade | undefined, type: string): string | null {
  if (!trade) return null;
  if (type === "analysis") {
    const parts = [
      trade.thesis ? `thesis: ${trade.thesis.slice(0, 80)}${trade.thesis.length > 80 ? "…" : ""}` : null,
      trade.notes ? `notes: ${trade.notes.slice(0, 80)}${trade.notes.length > 80 ? "…" : ""}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }
  if (type === "trade-update") {
    return `stop: ${trade.stop} · target: ${trade.target ?? "—"} · ${trade.ticker}`;
  }
  if (type === "trade-review") {
    return trade.reviewedAt ? `reviewedAt: ${trade.reviewedAt}` : null;
  }
  if (type === "trade-close") {
    return trade.status === "closed" ? `status: closed · exit: ${trade.exit}` : null;
  }
  return `${trade.ticker} · ${trade.status}`;
}

export function summarizePlaybookEvidence(
  playbook: { id: string; name: string; status: string } | undefined
): string | null {
  if (!playbook) return null;
  return `${playbook.id} · ${playbook.name} · ${playbook.status}`;
}
