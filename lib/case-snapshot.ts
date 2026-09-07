import { diagnoseCase } from "./case-diagnosis";
import { evaluateCase, ohlcvEvidenceFromMarketReality } from "./case-evaluation";
import { getImprovementHypothesisById, getImprovementHypothesesByOriginPlanId } from "./improvement-hypothesis-store";
import type { ImprovementHypothesis } from "./improvement-hypothesis-types";
import { buildInsightsCaseSpine, resolveLearningOutcomeForPlan } from "./insights-case-spine";
import type { InsightsCaseRow } from "./insights-case-spine-types";
import { getLearningOutcomes } from "./learning-outcome-store";
import type { LearningOutcome } from "./learning-outcome-types";
import { buildMarketRealityViewModel, geometryForCaseEvaluation } from "./market-reality";
import { listMarketRealityWindowsForRead } from "./market-reality-store";
import type { MarketRealityCaseWindow } from "./market-reality-types";
import { getMafExperiments } from "./maf-store";
import type { MafExperiment } from "./maf-types";
import { getObservationById, getObservations } from "./observation-store";
import type { ObservationRecord } from "./observation-types";
import { getPlanById, getPlans } from "./plans";
import { computePlannedRR } from "./plan-risk";
import type { TradePlan } from "./plan-types";
import { getPlaybookById } from "./playbooks";
import { getStockThesisById } from "./stock-theses";
import { getTrades } from "./storage";
import { wrapSnapshotText } from "./snapshot-verification";
import { buildCase } from "./thesis-case";
import type { ThesisCase } from "./thesis-case-types";
import type { Trade } from "./types";

type LinkStatus = "LINKED" | "MISSING" | "ORPHAN" | "AMBIGUOUS" | "DERIVED";

type CaseSnapshotModel = {
  generatedAt: string;
  plan: TradePlan;
  thesisCase: ThesisCase;
  caseRow: InsightsCaseRow | null;
  playbookName: string | null;
  stockFileLink: string | null;
  decisionId: string | null;
  geometricRR: number | null;
  rrConsistency: "OK" | "WRONG" | "UNAVAILABLE";
  rrDifference: number | null;
  realityWindows: MarketRealityCaseWindow[];
  realityView: ReturnType<typeof buildMarketRealityViewModel>;
  retrospectiveView: ReturnType<typeof buildMarketRealityViewModel>;
  evaluation: ReturnType<typeof evaluateCase>;
  learningOutcome: LearningOutcome | null;
  learningOutcomeMatches: LearningOutcome[];
  observation: ObservationRecord | null;
  observationMatches: ObservationRecord[];
  observationFromLo: ObservationRecord | null;
  maf: MafExperiment | null;
  mafMatches: MafExperiment[];
  improvement: ImprovementHypothesis | null;
  improvementMatches: ImprovementHypothesis[];
  trade: Trade | null;
  tradeMatches: Trade[];
  integrityWarnings: string[];
  linkStatuses: Record<string, LinkStatus>;
};

function fmt(value: unknown): string {
  if (value === undefined) return "MISSING";
  if (value === null) return "null";
  if (typeof value === "string") return value.trim() || '""';
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "MISSING";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : "[]";
  return JSON.stringify(value);
}

function fmtNum(value: number | null | undefined, digits = 4): string {
  if (value == null || !Number.isFinite(value)) return "null";
  return Number(value.toFixed(digits)).toString();
}

function fmtAudit(value: unknown): string {
  if (!value) return "null";
  return JSON.stringify(value);
}

function fmtList(lines: string[]): string {
  if (lines.length === 0) return "(none)";
  return lines.join(" | ");
}

function statusFromCount(count: number, derived = false): LinkStatus {
  if (derived) return "DERIVED";
  if (count <= 0) return "MISSING";
  if (count === 1) return "LINKED";
  return "AMBIGUOUS";
}

function summarizeWindow(window: MarketRealityCaseWindow): string {
  return `${window.id} (${window.windowKind} ${window.windowStart} -> ${window.windowEnd})`;
}

function inferEventOrder(input: {
  observation: ObservationRecord | null;
  retrospective: ReturnType<typeof buildMarketRealityViewModel>;
}): string {
  const obs = input.observation;
  if (obs?.firstTerminalEvent) return obs.firstTerminalEvent;
  const summary = input.retrospective.summary;
  if (!summary) return "MISSING";
  if (summary.stopLevelReached === "YES" && summary.targetReached === "NO") {
    return "stop_before_target";
  }
  if (summary.targetReached === "YES" && summary.stopLevelReached === "NO") {
    return "target_before_stop";
  }
  if (summary.targetReached === "YES" && summary.stopLevelReached === "YES") {
    return "both_reached_order_unknown";
  }
  return "UNRESOLVED";
}

function explainT0Source(c: ThesisCase): string {
  const source = c.temporalIntegrity.t0Source;
  const kind = c.freeze?.recordKind ?? "original";
  return `${source}; recordKind=${kind}`;
}

function exAnteIntegrityForSnapshot(
  c: ThesisCase
): "unavailable" | "supported_legacy" | "verified_t0" {
  if (!c.t0Evidence.available) return "supported_legacy";
  return c.t0Evidence.integrity === "verified" ? "verified_t0" : "supported_legacy";
}

function describeRealityEvidence(model: CaseSnapshotModel): string {
  const parts: string[] = [];
  if (model.realityView.available && model.realityView.summary) {
    parts.push(
      `primary:${model.realityView.window?.id} zone=${model.realityView.summary.thesisZoneReached} stop=${model.realityView.summary.stopLevelReached} target=${model.realityView.summary.targetReached}`
    );
  }
  if (model.retrospectiveView.available && model.retrospectiveView.summary) {
    parts.push(
      `retrospective:${model.retrospectiveView.window?.id} zone=${model.retrospectiveView.summary.thesisZoneReached} stop=${model.retrospectiveView.summary.stopLevelReached} target=${model.retrospectiveView.summary.targetReached}`
    );
  }
  const obs = model.thesisCase.postDecision.marketReality.observations;
  if (obs.length > 0) {
    parts.push(
      `OBS:${obs.map((o) => `${o.id}[target=${fmt(o.targetReached)} invalidated=${fmt(o.thesisInvalidated)}]`).join(", ")}`
    );
  }
  return fmtList(parts);
}

async function buildCanonicalEvaluation(
  thesisCase: ThesisCase,
  plan: TradePlan
): Promise<{
  realityView: ReturnType<typeof buildMarketRealityViewModel>;
  retrospectiveView: ReturnType<typeof buildMarketRealityViewModel>;
  evaluation: ReturnType<typeof evaluateCase>;
}> {
  const thesis = plan.stockThesisId ? await getStockThesisById(plan.stockThesisId) : null;
  const windows = await listMarketRealityWindowsForRead();
  const primaryWindow =
    windows.find((w) => w.planId.toUpperCase() === plan.id.toUpperCase() && w.windowKind === "original_plan_window") ?? null;
  const retrospectiveWindow =
    windows.find((w) => w.planId.toUpperCase() === plan.id.toUpperCase() && w.windowKind === "retrospective_observation") ?? null;
  const geometry = geometryForCaseEvaluation({
    freeze: thesisCase.freeze,
    plan,
    thesis,
  });
  const realityView = buildMarketRealityViewModel({
    window: primaryWindow,
    geometry,
    exAnteIntegrity: exAnteIntegrityForSnapshot(thesisCase),
  });
  const retrospectiveView = buildMarketRealityViewModel({
    window: retrospectiveWindow,
    geometry,
    exAnteIntegrity: exAnteIntegrityForSnapshot(thesisCase),
  });
  const ohlcv =
    ohlcvEvidenceFromMarketReality({
      planId: plan.id,
      retrospective: retrospectiveView,
    }) ??
    ohlcvEvidenceFromMarketReality({
      planId: plan.id,
      retrospective: realityView,
    });
  return { realityView, retrospectiveView, evaluation: evaluateCase({ thesisCase, ohlcv }) };
}

async function resolveTrade(plan: TradePlan, learningOutcome: LearningOutcome | null): Promise<{
  trade: Trade | null;
  matches: Trade[];
}> {
  const trades = await getTrades();
  const key = plan.id.toUpperCase();
  const matches = trades.filter(
    (t) =>
      t.planId?.toUpperCase() === key ||
      (plan.linkedTradeId && t.id.toUpperCase() === plan.linkedTradeId.toUpperCase()) ||
      (learningOutcome?.tradeId && t.id.toUpperCase() === learningOutcome.tradeId.toUpperCase())
  );
  return { trade: matches[0] ?? null, matches };
}

export async function buildCaseSnapshotModel(planId: string): Promise<CaseSnapshotModel | null> {
  const plan = await getPlanById(planId);
  if (!plan) return null;

  const [thesisCase, playbook, caseSpine, learningOutcomes, observations, mafExperiments] =
    await Promise.all([
      buildCase(plan.id),
      plan.playbookId ? getPlaybookById(plan.playbookId) : Promise.resolve(undefined),
      buildInsightsCaseSpine(),
      getLearningOutcomes(),
      getObservations(),
      getMafExperiments(),
    ]);
  if (!thesisCase) return null;

  const caseRow = caseSpine.find((row) => row.planId.toUpperCase() === plan.id.toUpperCase()) ?? null;
  const [reality, improvementMatches] = await Promise.all([
    buildCanonicalEvaluation(thesisCase, plan),
    getImprovementHypothesesByOriginPlanId(plan.id),
  ]);

  const allTrades = await getTrades();
  const learningOutcomeMatches = learningOutcomes.filter(
    (lo) => lo.planId?.toUpperCase() === plan.id.toUpperCase() && !lo.tradeId
  );
  const learningOutcome =
    resolveLearningOutcomeForPlan({
      plan,
      learningOutcomes,
      trades: allTrades,
    }) ?? learningOutcomeMatches[0] ?? null;
  const observationMatches = observations.filter(
    (obs) => obs.planId?.toUpperCase() === plan.id.toUpperCase() && !obs.tradeId
  );
  const observation = observationMatches[0] ?? null;
  const observationFromLo =
    learningOutcome?.observationId ? (await getObservationById(learningOutcome.observationId)) ?? null : null;
  const mafMatches = mafExperiments.filter(
    (maf) => maf.planId?.toUpperCase() === plan.id.toUpperCase() && !maf.tradeId
  );
  const maf = mafMatches[0] ?? null;
  const improvement =
    (plan.improvementHypothesisId
      ? await getImprovementHypothesisById(plan.improvementHypothesisId)
      : null) ??
    improvementMatches[0] ??
    null;
  const { trade, matches: tradeMatches } = await resolveTrade(plan, learningOutcome);

  const stockFileLink = plan.stockThesisId ? `/mxt/stock-theses/${plan.stockThesisId}` : null;
  const decisionId = plan.decision?.id ?? thesisCase.freeze?.decision?.decisionId ?? null;
  const geometricRR =
    plan.plannedEntry != null && plan.stopPrice != null && plan.targetPrice != null
      ? computePlannedRR(plan.plannedEntry, plan.stopPrice, plan.targetPrice)?.rr ?? null
      : null;
  const persistedRR = plan.plannedRR ?? null;
  const rrDifference =
    persistedRR != null && geometricRR != null ? Number((persistedRR - geometricRR).toFixed(6)) : null;
  const rrConsistency =
    persistedRR == null || geometricRR == null
      ? "UNAVAILABLE"
      : Math.abs(rrDifference ?? 0) <= 1e-6
        ? "OK"
        : "WRONG";
  const realityWindows = (await listMarketRealityWindowsForRead()).filter(
    (w) => w.planId.toUpperCase() === plan.id.toUpperCase()
  );

  const integrityWarnings: string[] = [];
  if (learningOutcomeMatches.length > 1) {
    integrityWarnings.push(`Multiple Learning Outcomes claim ${plan.id}.`);
  }
  if (observationMatches.length > 1) {
    integrityWarnings.push(`Multiple Observations claim ${plan.id}.`);
  }
  if (mafMatches.length > 1) {
    integrityWarnings.push(`Multiple MAF records claim ${plan.id}.`);
  }
  if (tradeMatches.length > 1) {
    integrityWarnings.push(`Multiple trades map to ${plan.id}.`);
  }
  if (learningOutcome?.observationId && !observationFromLo) {
    integrityWarnings.push(
      `${learningOutcome.id} references missing Observation ${learningOutcome.observationId}.`
    );
  }
  if (observation && learningOutcome && observation.learningOutcomeId && observation.learningOutcomeId !== learningOutcome.id) {
    integrityWarnings.push(
      `${observation.id} links to ${observation.learningOutcomeId}, not ${learningOutcome.id}.`
    );
  }
  if (caseRow && caseRow.stockThesisId && plan.stockThesisId && caseRow.stockThesisId !== plan.stockThesisId) {
    integrityWarnings.push(
      `Case spine stockThesisId ${caseRow.stockThesisId} disagrees with plan ${plan.stockThesisId}.`
    );
  }
  if (caseRow && caseRow.playbookId !== (plan.playbookId ?? null)) {
    integrityWarnings.push(
      `Case spine playbookId ${caseRow.playbookId ?? "null"} disagrees with plan ${plan.playbookId ?? "null"}.`
    );
  }
  if (caseRow) {
    const recomputedDiagnosis = diagnoseCase({
      thesisCase,
      evaluation: reality.evaluation,
      participation: caseRow.participation,
      counterfactualR: learningOutcome?.counterfactualR ?? null,
    });
    if (recomputedDiagnosis.equationId !== caseRow.equationId) {
      integrityWarnings.push(
        `Case spine equation ${caseRow.equationId} disagrees with recomputed ${recomputedDiagnosis.equationId}.`
      );
    }
  }

  const linkStatuses: Record<string, LinkStatus> = {
    decision: decisionId ? "LINKED" : "MISSING",
    t0: thesisCase.freeze
      ? thesisCase.freeze.planIds.some((id) => id.toUpperCase() === plan.id.toUpperCase()) ||
        thesisCase.freeze.plan.planId.toUpperCase() === plan.id.toUpperCase()
        ? "LINKED"
        : "ORPHAN"
      : "MISSING",
    reality:
      realityWindows.length > 0
        ? "LINKED"
        : reality.evaluation.realityRelationship.value !== "INDETERMINATE"
          ? "DERIVED"
          : "MISSING",
    trade: statusFromCount(tradeMatches.length),
    outcome: plan.outcome ? "LINKED" : "MISSING",
    learningOutcome: learningOutcome?.planId?.toUpperCase() === plan.id.toUpperCase()
      ? learningOutcomeMatches.length > 1
        ? "AMBIGUOUS"
        : "LINKED"
      : learningOutcome
        ? "ORPHAN"
        : "MISSING",
    observation: observation?.planId?.toUpperCase() === plan.id.toUpperCase()
      ? observationMatches.length > 1
        ? "AMBIGUOUS"
        : "LINKED"
      : observation
        ? "ORPHAN"
        : "MISSING",
    maf: maf?.planId?.toUpperCase() === plan.id.toUpperCase()
      ? mafMatches.length > 1
        ? "AMBIGUOUS"
        : "LINKED"
      : maf
        ? "ORPHAN"
        : "MISSING",
    improvement: improvement
      ? improvement.originPlanId.toUpperCase() === plan.id.toUpperCase()
        ? improvementMatches.length > 1
          ? "AMBIGUOUS"
          : "LINKED"
        : improvement.evidencePlanIds.some((id) => id.toUpperCase() === plan.id.toUpperCase())
          ? "DERIVED"
          : "ORPHAN"
      : "MISSING",
  };

  return {
    generatedAt: new Date().toISOString(),
    plan,
    thesisCase,
    caseRow,
    playbookName: playbook?.name ?? null,
    stockFileLink,
    decisionId,
    geometricRR,
    rrConsistency,
    rrDifference,
    realityWindows,
    realityView: reality.realityView,
    retrospectiveView: reality.retrospectiveView,
    evaluation: reality.evaluation,
    learningOutcome,
    learningOutcomeMatches,
    observation,
    observationMatches,
    observationFromLo,
    maf,
    mafMatches,
    improvement,
    improvementMatches,
    trade,
    tradeMatches,
    integrityWarnings,
    linkStatuses,
  };
}

export async function buildCaseSnapshot(planId: string): Promise<string | null> {
  const model = await buildCaseSnapshotModel(planId);
  if (!model) return null;
  const { plan, thesisCase, caseRow, learningOutcome, observation, observationFromLo, maf, improvement, trade } = model;
  const freeze = thesisCase.freeze;
  const outcome = plan.outcome ?? null;
  const t0Plan = thesisCase.t0Evidence.plan;
  const t0Decision = thesisCase.t0Evidence.decision;
  const retrospective = model.retrospectiveView.summary;
  const primary = model.realityView.summary;

  const lines: string[] = [];
  lines.push(`PLAN ID: ${plan.id}`);
  lines.push(`GENERATED: ${model.generatedAt}`);
  lines.push(
    "SOURCE: buildCase + buildInsightsCaseSpine + evaluateCase + buildMarketRealityViewModel + plan/learning/observation/maf/improvement stores"
  );
  lines.push("PURPOSE: Canonical single-plan case inspection artifact. Read-only; no repair, sync, or Apply.");
  lines.push("");

  lines.push("--- 1. IDENTITY ---");
  lines.push(`ticker: ${plan.ticker}`);
  lines.push(`planId: ${plan.id}`);
  lines.push(`stockThesisId: ${plan.stockThesisId ?? "null"}`);
  lines.push(`stockFileLink: ${model.stockFileLink ?? "null"}`);
  lines.push(`playbookId: ${plan.playbookId ?? freeze?.plan.playbookId ?? "null"}`);
  lines.push(`playbookName: ${model.playbookName ?? "null"}`);
  lines.push(`decisionId: ${model.decisionId ?? "null"}`);
  lines.push(`decision: ${plan.decision?.verdict ?? t0Decision?.verdict ?? "null"}`);
  lines.push(`decidedAt: ${plan.decision?.decidedAt ?? t0Decision?.decidedAt ?? "null"}`);
  lines.push("");

  lines.push("--- 2. PLAN GEOMETRY / VALIDITY ---");
  lines.push(`plannedEntry: ${fmt(plan.plannedEntry ?? null)}`);
  lines.push(`stopPrice: ${fmt(plan.stopPrice ?? null)}`);
  lines.push(`targetPrice: ${fmt(plan.targetPrice ?? null)}`);
  lines.push(`support: ${fmt(plan.supportLevel ?? null)}`);
  lines.push(`plannedRR persisted: ${fmtNum(plan.plannedRR ?? null)}`);
  lines.push(`plannedRR geometric: ${fmtNum(model.geometricRR)}`);
  lines.push(`validFrom: ${fmt(plan.validFrom ?? null)}`);
  lines.push(`validUntil: ${fmt(plan.validUntil ?? null)}`);
  lines.push(`executionInstruction: ${fmt(plan.executionInstruction ?? null)}`);
  lines.push(`consistency: ${model.rrConsistency}`);
  lines.push(`difference: ${model.rrDifference == null ? "null" : model.rrDifference}`);
  lines.push("");

  lines.push("--- 3. T0 / ORIGINAL EVIDENCE ---");
  lines.push(`t0Available: ${thesisCase.t0Evidence.available}`);
  lines.push(`freezeId: ${freeze?.id ?? "null"}`);
  lines.push(`t0: ${freeze?.t0 ?? "null"}`);
  lines.push(`recordKind: ${freeze?.recordKind ?? (freeze ? "original" : "null")}`);
  lines.push(`confidence: ${freeze?.confidence ?? "unavailable"}`);
  lines.push(`source/mechanism: ${freeze ? explainT0Source(thesisCase) : "none"}`);
  lines.push(`planIds: ${freeze ? JSON.stringify(freeze.planIds) : "[]"}`);
  lines.push(`geometryAtT0: ${fmtAudit(t0Plan)}`);
  lines.push(`evidence/provenance: ${thesisCase.t0Evidence.reason ?? thesisCase.temporalIntegrity.t0Source}`);
  lines.push(`correctionAudit: ${fmtAudit(freeze?.correctionAudit ?? null)}`);
  lines.push("");

  lines.push("--- 4. REALITY / PATH ---");
  lines.push(`marketRealityIds: ${model.realityWindows.length ? JSON.stringify(model.realityWindows.map((w) => w.id)) : "[]"}`);
  lines.push(`realityWindow(s): ${model.realityWindows.length ? model.realityWindows.map(summarizeWindow).join(" | ") : "MISSING"}`);
  lines.push(`entryReached: ${fmt(outcome?.entryReached ?? primary?.entryLevelReached ?? retrospective?.entryLevelReached ?? null)}`);
  lines.push(`stopReached: ${fmt(outcome?.stopTriggered ?? observation?.stopTriggered ?? primary?.stopLevelReached ?? retrospective?.stopLevelReached ?? null)}`);
  lines.push(`targetReached: ${fmt(outcome?.targetTriggered ?? observation?.targetTriggered ?? primary?.targetReached ?? retrospective?.targetReached ?? null)}`);
  lines.push(`stopBeforeTarget: ${fmt(outcome?.stopReachedBeforeTarget ?? null)}`);
  lines.push(`targetBeforeStop: ${fmt(outcome?.targetReachedBeforeStop ?? null)}`);
  lines.push(`eventOrder: ${inferEventOrder({ observation, retrospective: model.retrospectiveView })}`);
  lines.push(`realityRelationship: ${caseRow?.reality ?? model.evaluation.realityRelationship.value}`);
  lines.push(`realityEvidence: ${describeRealityEvidence(model)}`);
  lines.push("");

  lines.push("--- 5. EXECUTION / TRADE ---");
  lines.push(`tradeLinked: ${trade ? "true" : "false"}`);
  lines.push(`tradeId: ${trade?.id ?? "null"}`);
  lines.push(`executionOccurred: ${trade ? "true" : "false"}`);
  lines.push(`nonExecutionReason: ${fmt(outcome?.nonExecutionReason ?? learningOutcome?.nonExecutionReason ?? null)}`);
  lines.push(`actualEntry: ${fmt(trade?.entry ?? null)}`);
  lines.push(`actualExit: ${fmt(trade?.exit ?? null)}`);
  lines.push(`realizedPnL: ${fmt(learningOutcome?.realizedPnL ?? null)}`);
  lines.push(`realizedR: ${fmt(trade?.riskRewardActual ?? learningOutcome?.realizedR ?? null)}`);
  lines.push("");

  lines.push("--- 6. PLAN OUTCOME ---");
  lines.push(`outcomeAvailable: ${outcome ? "true" : "false"}`);
  lines.push(`outcomeKind: ${fmt(outcome?.outcomeKind ?? null)}`);
  lines.push(`recordedAt: ${fmt(outcome?.recordedAt ?? null)}`);
  lines.push(`entryReached: ${fmt(outcome?.entryReached ?? null)}`);
  lines.push(`stopReachedBeforeTarget: ${fmt(outcome?.stopReachedBeforeTarget ?? null)}`);
  lines.push(`targetReachedBeforeStop: ${fmt(outcome?.targetReachedBeforeStop ?? null)}`);
  lines.push(`nonExecutionReason: ${fmt(outcome?.nonExecutionReason ?? null)}`);
  lines.push(`realizedR: ${fmt(outcome?.realizedResultR ?? learningOutcome?.realizedR ?? null)}`);
  lines.push(`counterfactualR: ${fmt(outcome?.theoreticalResultR ?? learningOutcome?.counterfactualR ?? null)}`);
  lines.push(`repairKind: ${fmt(outcome?.recordKind ?? null)}`);
  lines.push(`correctionAudit: ${fmtAudit(outcome?.correctionAudit ?? null)}`);
  lines.push("");

  lines.push("--- 7. CASE / EVALUATION ---");
  lines.push(`family: ${caseRow?.family ?? "MISSING"}`);
  lines.push(`familyLabel: ${caseRow?.family ?? "MISSING"}`);
  lines.push(`subtype: ${caseRow?.caseDSubtype ?? "null"}`);
  lines.push(`diagnosis: ${caseRow?.diagnosis.classification.value ?? "MISSING"}`);
  lines.push(`evaluationCode: ${caseRow?.equationId ?? "MISSING"}`);
  lines.push(`decisionQuality: ${caseRow?.decisionQuality ?? model.evaluation.decisionQuality.value}`);
  lines.push(`executionQuality: ${caseRow?.executionQuality ?? model.evaluation.executionQuality.value}`);
  lines.push(`realityRelationship: ${caseRow?.reality ?? model.evaluation.realityRelationship.value}`);
  lines.push(`evaluable: ${caseRow ? (caseRow.family === "A" || caseRow.family === "B" || caseRow.family === "C" || caseRow.family === "D" ? "true" : "false") : "false"}`);
  lines.push(`reason: ${caseRow?.diagnosisReason ?? fmtList(model.evaluation.uncertainty)}`);
  lines.push("");

  lines.push("--- 8. LEARNING OUTCOME ---");
  lines.push(`loAvailable: ${learningOutcome ? "true" : "false"}`);
  lines.push(`loId: ${learningOutcome?.id ?? "null"}`);
  lines.push(`kind: ${learningOutcome?.kind ?? "null"}`);
  lines.push(`planId: ${learningOutcome?.planId ?? "null"}`);
  lines.push(`observationId: ${learningOutcome?.observationId ?? "null"}`);
  lines.push(`realizedR: ${fmt(learningOutcome?.realizedR ?? null)}`);
  lines.push(`counterfactualR: ${fmt(learningOutcome?.counterfactualR ?? null)}`);
  lines.push(`nonExecutionReason: ${fmt(learningOutcome?.nonExecutionReason ?? null)}`);
  lines.push("");

  lines.push("--- 9. OBSERVATION ---");
  lines.push(`obsAvailable: ${observation ? "true" : "false"}`);
  lines.push(`obsId: ${observation?.id ?? learningOutcome?.observationId ?? "null"}`);
  lines.push(`planId: ${observation?.planId ?? "null"}`);
  lines.push(`kind/status: ${observation ? `${observation.observationKind ?? "null"} / ${observation.status}` : "null"}`);
  lines.push(`reality linkage: ${observation ? `target=${fmt(observation.targetReached)} invalidated=${fmt(observation.thesisInvalidated)}` : "null"}`);
  lines.push(`outcome linkage: ${observation ? `theoreticalR=${fmt(observation.theoreticalResultR)} realizedR=${fmt(observation.realizedResultR)}` : "null"}`);
  if (learningOutcome?.observationId && !observationFromLo) {
    lines.push("status: ORPHAN");
  }
  lines.push("");

  lines.push("--- 10. MAF ATTRIBUTION ---");
  lines.push(`mafAvailable: ${maf ? "true" : "false"}`);
  lines.push(`mafId: ${maf?.id ?? "null"}`);
  lines.push(`planId: ${maf?.planId ?? "null"}`);
  lines.push(`status: ${maf?.status ?? "null"}`);
  lines.push(`primaryDrag: ${maf?.primaryDragComponent ?? "null"}`);
  lines.push(`component attribution: ${maf ? fmtAudit(maf.attributions) : "null"}`);
  lines.push(`provenance: ${maf ? maf.source ?? "accepted_maf" : "null"}`);
  lines.push(`acceptedAt: ${maf?.updatedAt ?? "null"}`);
  lines.push("");

  lines.push("--- 11. IMPROVEMENT PATH ---");
  lines.push(`improvementHypothesisAvailable: ${improvement ? "true" : "false"}`);
  lines.push(`hypothesisId: ${improvement?.id ?? plan.improvementHypothesisId ?? "null"}`);
  lines.push(`originCase: ${improvement?.originPlanId ?? "null"}`);
  lines.push(`targetComponent: ${improvement?.componentId ?? "null"}`);
  lines.push(`status: ${improvement?.status ?? "null"}`);
  lines.push(`evidenceCount: ${improvement ? improvement.evidencePlanIds.length : "null"}`);
  lines.push(`verdict: ${improvement?.evidenceVerdictNote ?? "null"}`);
  lines.push("");

  lines.push("--- 12. PROVENANCE / INTEGRITY ---");
  lines.push(`Decision -> Plan: ${model.linkStatuses.decision}`);
  lines.push(`T0 -> Plan: ${model.linkStatuses.t0}`);
  lines.push(`Reality -> Plan: ${model.linkStatuses.reality}`);
  lines.push(`Trade -> Plan: ${model.linkStatuses.trade}`);
  lines.push(`Outcome -> Plan: ${model.linkStatuses.outcome}`);
  lines.push(`LO -> Plan: ${model.linkStatuses.learningOutcome}`);
  lines.push(`OBS -> Plan: ${model.linkStatuses.observation}`);
  lines.push(`MAF -> Plan: ${model.linkStatuses.maf}`);
  lines.push(`Improvement Hypothesis -> Case/Plan: ${model.linkStatuses.improvement}`);
  lines.push("integrityWarnings:");
  if (model.integrityWarnings.length === 0) {
    lines.push("- (none)");
  } else {
    for (const warning of model.integrityWarnings) lines.push(`- ${warning}`);
  }
  lines.push("");

  lines.push("--- 13. CANONICAL CHAIN ---");
  lines.push(`PLAN -> ${plan.id} + LINKED`);
  lines.push(`Decision -> ${model.decisionId ?? "MISSING"} + ${model.linkStatuses.decision}`);
  lines.push(`Geometry -> ${plan.id} + LINKED`);
  lines.push(`T0 -> ${freeze?.id ?? "MISSING"} + ${model.linkStatuses.t0}`);
  lines.push(`Reality -> ${model.realityWindows[0]?.id ?? "MISSING"} + ${model.linkStatuses.reality}`);
  lines.push(`Execution/Trade -> ${trade?.id ?? "MISSING"} + ${model.linkStatuses.trade}`);
  lines.push(`Outcome -> ${outcome?.outcomeKind ?? "MISSING"} + ${model.linkStatuses.outcome}`);
  lines.push(`LO -> ${learningOutcome?.id ?? "MISSING"} + ${model.linkStatuses.learningOutcome}`);
  lines.push(`OBS -> ${(observation?.id ?? learningOutcome?.observationId) ?? "MISSING"} + ${model.linkStatuses.observation}`);
  lines.push(`Case/Diagnosis -> ${caseRow?.equationId ?? "MISSING"} + DERIVED`);
  lines.push(`MAF -> ${maf?.id ?? "MISSING"} + ${model.linkStatuses.maf}`);
  lines.push(`Improvement Path -> ${improvement?.id ?? "MISSING"} + ${model.linkStatuses.improvement}`);

  return wrapSnapshotText("Case Snapshot", lines.join("\n"));
}
