import { diagnoseCase } from "./case-diagnosis";
import { evaluateCase, ohlcvEvidenceFromMarketReality } from "./case-evaluation";
import { getImprovementHypothesisById, getImprovementHypothesesByOriginPlanId } from "./improvement-hypothesis-store";
import type { ImprovementHypothesis } from "./improvement-hypothesis-types";
import { buildInsightsCaseSpine } from "./insights-case-spine";
import type { InsightsCaseRow } from "./insights-case-spine-types";
import { getLearningOutcomes } from "./learning-outcome-store";
import { resolveLearningOutcomeForPlan } from "./learning-outcome-resolve";
import type { LearningOutcome } from "./learning-outcome-types";
import { buildMarketRealityViewModel, geometryForCaseEvaluation } from "./market-reality";
import { listMarketRealityWindowsForRead } from "./market-reality-store";
import type { MarketRealityCaseWindow } from "./market-reality-types";
import { getMafExperiments } from "./maf-store";
import { MAF_COMPONENT_LABELS, type MafExperiment } from "./maf-types";
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
import {
  buildHistoricalCaseAttribution,
  resolveMafForTrade,
} from "./historical-case-attribution";
import { getTradesStoreMode, isSupabaseTradesStore } from "./trades-json";
import type { Trade } from "./types";
import { analyzeOpportunityConsumption } from "./opportunity-consumption";

type LinkStatus = "LINKED" | "MISSING" | "ORPHAN" | "AMBIGUOUS" | "DERIVED";

export type CaseSnapshotIdentity = {
  caseId: string;
  planId: string;
  caseOrigin: "modern" | "historical_trade";
  ticker: string;
};

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
  if (typeof value === "boolean") return value ? "YES" : "NO";
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

function fmtR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "null";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function fmtDurationMs(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) return "null";
  const totalMinutes = Math.round(value / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
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
  return c.temporalIntegrity.t0Source;
}

function summarizeMafAttributions(maf: MafExperiment | null): string[] {
  if (!maf) return ["none"];
  const attributions = maf.attributions ?? [];
  const reasonings = [...new Set(attributions.map((item) => item.reasoning?.trim()).filter(Boolean))];
  const evidenceKeys = [...new Set(attributions.map((item) => JSON.stringify(item.evidenceRefs ?? [])))];
  const primaryDragLabel = maf.primaryDragComponent
    ? MAF_COMPONENT_LABELS[maf.primaryDragComponent] ?? maf.primaryDragComponent
    : null;
  const lines = [
    `${maf.id} · ${maf.status}`,
    `Primary drag: ${primaryDragLabel ?? "none"}`,
    `Provenance: ${maf.source ?? "accepted_maf"}`,
  ];
  if (reasonings.length === 1) {
    lines.push("");
    lines.push("Reasoning:");
    lines.push(reasonings[0]);
  }
  if (evidenceKeys.length === 1) {
    const refs = JSON.parse(evidenceKeys[0] ?? "[]") as string[];
    lines.push(`Evidence refs: ${refs.length ? refs.join(", ") : "(none)"}`);
  }
  if (attributions.length === 0) {
    lines.push("");
    lines.push("Components:");
    lines.push("none");
    return lines;
  }
  lines.push("");
  lines.push("Components:");
  for (const item of attributions) {
    const label = MAF_COMPONENT_LABELS[item.component] ?? item.component;
    const confidence =
      item.aiInterpretationConfidence == null ? "" : ` @${item.aiInterpretationConfidence}`;
    lines.push(`${label}: ${item.classification}${confidence}`);
    if (reasonings.length !== 1 && item.reasoning?.trim()) {
      lines.push(`Reasoning: ${item.reasoning.trim()}`);
    }
    if (evidenceKeys.length !== 1) {
      lines.push(`Evidence refs: ${item.evidenceRefs?.length ? item.evidenceRefs.join(", ") : "(none)"}`);
    }
  }
  return lines;
}

function summarizeIssueLines(input: {
  linkStatuses: Record<string, LinkStatus>;
  rrConsistency: "OK" | "WRONG" | "UNAVAILABLE";
  integrityWarnings: string[];
  freezeCorrectionAudit: unknown;
  outcomeCorrectionAudit: unknown;
  missingRequired: string[];
  analysisStatus: string;
  extraWarnings?: string[];
}): string[] {
  const lines = [
    `analysisStatus: ${input.analysisStatus}`,
    `missingRequired: ${input.missingRequired.length ? input.missingRequired.join(", ") : "(none)"}`,
  ];
  if (input.rrConsistency !== "OK") {
    lines.push(`rrConsistency: ${input.rrConsistency}`);
  }
  const linkageCaveats = Object.entries(input.linkStatuses)
    .filter(([, status]) => status === "ORPHAN" || status === "AMBIGUOUS" || status === "DERIVED")
    .map(([key, status]) => `${key}=${status}`);
  if (linkageCaveats.length > 0) {
    lines.push(`linkageCaveats: ${linkageCaveats.join(" | ")}`);
  }
  lines.push("integrityWarnings:");
  const warnings = [
    ...input.integrityWarnings,
    ...(input.extraWarnings ?? []),
    summarizeCorrectionAudit("T0 correction", input.freezeCorrectionAudit),
    summarizeCorrectionAudit("Outcome correction", input.outcomeCorrectionAudit),
  ].filter(Boolean) as string[];
  if (warnings.length === 0) {
    lines.push("- (none)");
  } else {
    for (const warning of warnings) lines.push(`- ${warning}`);
  }
  return lines;
}

function pushIf(lines: string[], label: string, value: string | null | undefined): void {
  if (value == null) return;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "(none)") return;
  lines.push(`${label}: ${trimmed}`);
}

function formatNullishCompact(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text || text === "null" || text === "MISSING") return null;
  return text;
}

function summarizeCorrectionAudit(
  label: "T0 correction" | "Outcome correction",
  audit: unknown
): string | null {
  if (!audit) return null;
  const first = Array.isArray(audit) ? audit[0] : audit;
  if (!first || typeof first !== "object") return `${label}: audited`;
  const kind = "kind" in first && typeof first.kind === "string" ? first.kind : null;
  return `${label}: ${kind ?? "recorded"} · audited`;
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

function buildCaseSnapshotUniverseIdentity(row: InsightsCaseRow): CaseSnapshotIdentity {
  return {
    caseId: row.caseId,
    planId: row.planId,
    caseOrigin: row.caseOrigin === "historical_trade" ? "historical_trade" : "modern",
    ticker: row.ticker,
  };
}

async function resolveCaseSnapshotIdentity(
  caseIdentity: string
): Promise<CaseSnapshotIdentity | null> {
  const needle = caseIdentity.trim().toUpperCase();
  const caseSpine = await buildInsightsCaseSpine();
  const row =
    caseSpine.find((item) => item.planId.toUpperCase() === needle) ??
    caseSpine.find((item) => item.caseId.toUpperCase() === needle);
  return row ? buildCaseSnapshotUniverseIdentity(row) : null;
}

async function buildHistoricalCaseSnapshotFromIdentity(
  identity: CaseSnapshotIdentity
): Promise<string | null> {
  const tradeId = identity.caseId.toUpperCase().startsWith("HIST:")
    ? identity.caseId.slice("HIST:".length)
    : identity.caseId;
  const [trades, learningOutcomes, observations, mafExperiments] = await Promise.all([
    getTrades(),
    getLearningOutcomes(),
    getObservations(),
    getMafExperiments(),
  ]);
  const trade = trades.find((item) => item.id.toUpperCase() === tradeId.toUpperCase()) ?? null;
  if (!trade) return null;

  const learningOutcome =
    learningOutcomes.find((row) => row.tradeId?.toUpperCase() === trade.id.toUpperCase()) ?? null;
  const observationMatches = observations.filter(
    (row) => row.tradeId?.toUpperCase() === trade.id.toUpperCase()
  );
  const observation = observationMatches[0] ?? null;
  const maf = resolveMafForTrade(trade.id, mafExperiments);
  const historical = buildHistoricalCaseAttribution({
    trade,
    maf,
    reconstructionNote: trade.notes?.trim() || trade.thesis?.trim() || null,
    stockThesisReconstructed: false,
  });

  const lines: string[] = [];
  lines.push(`${trade.ticker} · ${identity.planId}`);
  lines.push("STATUS: INCOMPLETE");
  lines.push("MISSING REQUIRED: Historical plan-backed T0");
  lines.push(`GENERATED: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("--- 1. CASE ---");
  lines.push(`Case ID: ${identity.caseId}`);
  lines.push(`Plan ID: ${identity.planId}`);
  lines.push(`Trade ID: ${trade.id}`);
  lines.push(`Stock File: ${learningOutcome?.stockThesisId ?? "none"}`);
  lines.push(`Playbook: ${trade.playbookId ?? "none"}`);
  lines.push(`Direction: ${(trade.direction ?? "unknown").toUpperCase()}`);
  lines.push(
    `Trade: Entry ${fmt(trade.entry)} · Stop ${fmt(trade.stop)} · Target ${fmt(trade.target ?? null)} · Exit ${fmt(trade.exit ?? null)} · Shares ${fmt(trade.shares)}`
  );
  lines.push("");

  lines.push("--- 2. EVIDENCE ---");
  lines.push("T0: MISSING");
  lines.push("No decision-time snapshot was preserved for this historical Case.");
  lines.push(`Historical T0 status: ${historical.t0Status}`);
  lines.push(`Execution evidence: Trade ${trade.id} · ${trade.status} · closed ${fmt(trade.closedAt ?? null)}`);
  pushIf(lines, "Observation", observation ? `${observation.id} · ${observation.status}` : null);
  lines.push("");

  lines.push("--- 3. RESULT ---");
  lines.push(`Outcome: executed_loss`);
  lines.push(`Realized: ${fmtR(trade.riskRewardActual ?? null)}`);
  pushIf(lines, "Learning", learningOutcome ? `${learningOutcome.id} · ${learningOutcome.kind}` : null);
  lines.push(`Historical attribution: ${historical.summary}`);
  lines.push(`Provenance caution: ${historical.confidenceNote}`);
  lines.push(...summarizeMafAttributions(maf));
  lines.push("");

  lines.push("--- 4. ISSUES ---");
  if (historical.unsupportedConclusions.length === 0) {
    lines.push("none");
  } else {
    for (const warning of historical.unsupportedConclusions) lines.push(`- ${warning}`);
  }

  return wrapSnapshotText("Case Snapshot", lines.join("\n"));
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

export async function listAvailableCaseSnapshotPlanIds(): Promise<string[]> {
  const plans = await getPlans();
  return [...new Set(plans.map((plan) => plan.id.toUpperCase()))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export async function listAvailableCaseSnapshotIdentities(): Promise<CaseSnapshotIdentity[]> {
  const caseSpine = await buildInsightsCaseSpine();
  return caseSpine
    .map(buildCaseSnapshotUniverseIdentity)
    .sort((a, b) => a.planId.localeCompare(b.planId));
}

export async function getCaseSnapshotRuntimeInfo(): Promise<{
  generatedAt: string;
  tradesStoreMode: string;
  supabaseBacked: boolean;
}> {
  return {
    generatedAt: new Date().toISOString(),
    tradesStoreMode: getTradesStoreMode(),
    supabaseBacked: isSupabaseTradesStore(),
  };
}

export async function buildCaseSnapshot(caseIdentity: string): Promise<string | null> {
  const identity = await resolveCaseSnapshotIdentity(caseIdentity);
  if (identity?.caseOrigin === "historical_trade") {
    return buildHistoricalCaseSnapshotFromIdentity(identity);
  }

  const model = await buildCaseSnapshotModel(caseIdentity);
  if (!model) return null;
  const { plan, thesisCase, caseRow, learningOutcome, observation, observationFromLo, maf, improvement, trade } = model;
  const freeze = thesisCase.freeze;
  const outcome = plan.outcome ?? null;
  const t0Plan = thesisCase.t0Evidence.plan;
  const t0Decision = thesisCase.t0Evidence.decision;
  const retrospective = model.retrospectiveView.summary;
  const primary = model.realityView.summary;
  const missingRequired = caseRow?.lifecycle.blockingLabels ?? [];
  const opportunityConsumption = analyzeOpportunityConsumption({
    window: model.retrospectiveView.window ?? model.realityView.window ?? null,
    plannedEntry: t0Plan?.plannedEntry ?? plan.plannedEntry ?? null,
    stopPrice: t0Plan?.stopPrice ?? plan.stopPrice ?? null,
    targetPrice: t0Plan?.targetPrice ?? plan.targetPrice ?? null,
    plannedRR: t0Plan?.plannedRR ?? plan.plannedRR ?? model.geometricRR,
    executionOccurred: Boolean(trade),
    learningOutcome,
  });

  const lines: string[] = [];
  lines.push(`${plan.ticker} · ${plan.id}`);
  lines.push(`STATUS: ${caseRow?.lifecycle.status ?? "INCOMPLETE"}`);
  lines.push(
    `MISSING REQUIRED: ${missingRequired.length ? missingRequired.join(", ") : "none"}`
  );
  lines.push(`GENERATED: ${model.generatedAt}`);
  lines.push("");

  lines.push("--- 1. CASE ---");
  lines.push(`Stock File: ${plan.stockThesisId ?? "none"}`);
  lines.push(`Playbook: ${model.playbookName ?? plan.playbookId ?? "none"}`);
  lines.push(
    `Decision: ${(plan.decision?.verdict ?? t0Decision?.verdict ?? "none").toUpperCase()} · ${(plan.decision?.decidedAt ?? t0Decision?.decidedAt ?? "none").slice(0, 10)}`
  );
  lines.push("Plan:");
  lines.push(
    `Entry ${fmt(plan.plannedEntry ?? null)} · Stop ${fmt(plan.stopPrice ?? null)} · Target ${fmt(plan.targetPrice ?? null)} · Support ${fmt(plan.supportLevel ?? null)}`
  );
  lines.push(`Planned R:R: ${fmtR(plan.plannedRR ?? model.geometricRR ?? null)}`);
  lines.push(
    `Valid: ${fmt(plan.validFrom ?? null)} → ${fmt(plan.validUntil ?? null)}`
  );
  lines.push("");

  lines.push("--- 2. EVIDENCE ---");
  if (!thesisCase.t0Evidence.available) {
    lines.push("T0: MISSING");
    lines.push(thesisCase.t0Evidence.reason ?? "No decision-time snapshot was preserved for this Plan.");
  } else {
    lines.push(`T0: ${freeze?.t0 ?? "available"}`);
    pushIf(lines, "T0 provenance", explainT0Source(thesisCase));
    pushIf(lines, "T0 confidence", freeze?.confidence ?? null);
  }
  lines.push("");
  lines.push("Reality:");
  lines.push(`Entry reached: ${fmt(outcome?.entryReached ?? primary?.entryLevelReached ?? retrospective?.entryLevelReached ?? null).toUpperCase()}`);
  lines.push(`Stop reached: ${fmt(outcome?.stopTriggered ?? observation?.stopTriggered ?? primary?.stopLevelReached ?? retrospective?.stopLevelReached ?? null).toUpperCase()}`);
  lines.push(`Target reached: ${fmt(outcome?.targetTriggered ?? observation?.targetTriggered ?? primary?.targetReached ?? retrospective?.targetReached ?? null).toUpperCase()}`);
  lines.push(`Observed order: ${inferEventOrder({ observation, retrospective: model.retrospectiveView })}`);
  lines.push(`Reality relationship: ${caseRow?.reality ?? model.evaluation.realityRelationship.value}`);
  lines.push("");
  lines.push("Evidence:");
  pushIf(lines, "Primary Reality", model.realityView.window?.id ?? null);
  pushIf(lines, "Retrospective Reality", model.retrospectiveView.window?.id ?? null);
  pushIf(
    lines,
    "Observation",
    observation ? `${observation.id} · ${observation.status}` : learningOutcome?.observationId ?? null
  );
  lines.push("");
  lines.push("Execution:");
  if (trade) {
    lines.push(
      `Trade ${trade.id} · Entry ${fmt(trade.entry ?? null)} · Exit ${fmt(trade.exit ?? null)}`
    );
  } else {
    lines.push(
      `No execution${formatNullishCompact(outcome?.nonExecutionReason ?? learningOutcome?.nonExecutionReason) ? ` · ${(outcome?.nonExecutionReason ?? learningOutcome?.nonExecutionReason ?? "").replaceAll("_", " ")}` : ""}`
    );
  }
  lines.push("");
  if (opportunityConsumption.available) {
    lines.push("Opportunity path:");
    lines.push(
      `Planned risk ${fmt(opportunityConsumption.plannedRiskPrice)} · favorable displacement ${fmt(opportunityConsumption.favorableDisplacementPrice)} (${fmtR(opportunityConsumption.favorableDisplacementR)})`
    );
    lines.push(
      `Peak ${fmt(opportunityConsumption.maxFavorablePrice)} @ ${fmt(opportunityConsumption.maxFavorableAt)} · pullback ${fmt(opportunityConsumption.subsequentPullbackPrice)} (${fmtR(opportunityConsumption.subsequentPullbackR)})`
    );
    lines.push(
      `Retested original entry after peak: ${fmt(opportunityConsumption.retestedOriginalEntryAfterPeak).toUpperCase()}`
    );
    lines.push(
      `Restored R:R on deepest pullback: ${fmtR(opportunityConsumption.restoredRRAtDeepestPullback)}`
    );
    lines.push(
      `Late-entry geometry: ${opportunityConsumption.lateEntryGeometryAvailable ? "available" : "unavailable"}`
    );
    pushIf(lines, "Late-entry guard", opportunityConsumption.lateEntryGeometryReason);
    if (opportunityConsumption.checkpoints.length > 0) {
      lines.push("Checkpoints:");
      for (const checkpoint of opportunityConsumption.checkpoints) {
        lines.push(
          `- ${fmtR(checkpoint.thresholdR)} @ ${fmt(checkpoint.thresholdPrice)} · reached ${fmt(checkpoint.reachedAt)} · post-MFE ${fmtR(checkpoint.subsequentMfeR)} · post-MAE ${fmtR(checkpoint.subsequentMaeR)} · pullback ${fmtR(checkpoint.pullbackDepthR)} in ${fmtDurationMs(checkpoint.timeToDeepestPullbackMs)} · retest entry ${fmt(checkpoint.retestedOriginalEntry).toUpperCase()} · target ${fmt(checkpoint.targetReachedAfterThreshold).toUpperCase()} · stop ${fmt(checkpoint.stopReachedAfterThreshold).toUpperCase()}`
        );
      }
    }
    if (opportunityConsumption.checkpointOrderingLimitation) {
      lines.push(`Checkpoint resolution note: ${opportunityConsumption.checkpointOrderingLimitation}`);
    }
    lines.push("");
  }

  lines.push("--- 3. RESULT ---");
  pushIf(lines, "Outcome", formatNullishCompact(outcome?.outcomeKind ?? learningOutcome?.kind) ?? "none");
  pushIf(lines, "Realized", fmtR(outcome?.realizedResultR ?? learningOutcome?.realizedR ?? trade?.riskRewardActual ?? 0));
  pushIf(lines, "Counterfactual", fmtR(outcome?.theoreticalResultR ?? learningOutcome?.counterfactualR ?? null));
  lines.push("");
  lines.push("Case:");
  lines.push(`Family: ${caseRow?.family ?? "MISSING"}${caseRow?.family === "B" ? " · No Entry" : ""}`);
  lines.push(`Diagnosis: ${caseRow?.diagnosis.classification.value ?? "MISSING"}`);
  lines.push(`Decision quality: ${caseRow?.decisionQuality ?? model.evaluation.decisionQuality.value}`);
  lines.push(`Execution quality: ${caseRow?.executionQuality ?? model.evaluation.executionQuality.value}`);
  lines.push(`Reason: ${caseRow?.diagnosisReason ?? fmtList(model.evaluation.uncertainty)}`);
  lines.push("");
  lines.push("Learning:");
  lines.push(`Learning Outcome: ${learningOutcome ? `${learningOutcome.id} · ${learningOutcome.kind}` : "none"}`);
  lines.push("");
  lines.push("MAF:");
  lines.push(...summarizeMafAttributions(maf));
  lines.push("");
  if (improvement) {
    lines.push(
      `Improvement Hypothesis: ${improvement.id} · ${improvement.componentId ?? "unknown"} · ${improvement.status}`
    );
  } else {
    lines.push("Improvement Hypothesis: none");
  }
  lines.push("");

  lines.push("--- 4. ISSUES ---");
  const issueLines = summarizeIssueLines({
    linkStatuses: model.linkStatuses,
    rrConsistency: model.rrConsistency,
    integrityWarnings: model.integrityWarnings,
    freezeCorrectionAudit: freeze?.correctionAudit ?? null,
    outcomeCorrectionAudit: outcome?.correctionAudit ?? null,
    missingRequired: [],
    analysisStatus: caseRow?.lifecycle.status ?? "INCOMPLETE",
    extraWarnings:
      learningOutcome?.observationId && !observationFromLo
        ? ["Observation referenced by Learning Outcome is missing from the current store."]
        : [],
  }).filter((line) => !line.startsWith("analysisStatus:") && !line.startsWith("missingRequired:"));
  const actionable = issueLines.filter(
    (line) =>
      line !== "linkageCaveats: trade=MISSING | improvement=MISSING" &&
      line !== "linkageCaveats: improvement=MISSING | trade=MISSING" &&
      line !== "linkageCaveats: (none)" &&
      line !== "integrityWarnings:" &&
      line !== "- (none)"
  );
  if (actionable.length === 0) {
    lines.push("none");
  } else {
    lines.push(...actionable);
  }

  return wrapSnapshotText("Case Snapshot", lines.join("\n"));
}

export async function buildPlanSnapshot(caseIdentity: string): Promise<string | null> {
  const identity = await resolveCaseSnapshotIdentity(caseIdentity);
  if (!identity || identity.caseOrigin === "historical_trade") return null;

  const model = await buildCaseSnapshotModel(identity.planId);
  if (!model) return null;

  const { plan, thesisCase, learningOutcome, trade, caseRow } = model;
  const freeze = thesisCase.freeze;
  const outcome = plan.outcome ?? null;

  const lines: string[] = [];
  lines.push(`PLAN ID: ${plan.id}`);
  lines.push(`CASE ID: ${caseRow?.planId ?? plan.id}`);
  lines.push(`GENERATED: ${model.generatedAt}`);
  lines.push(
    "SOURCE: buildCaseSnapshotModel + canonical plan/thesis/t0/outcome/learning readers"
  );
  lines.push("PURPOSE: Canonical single-plan inspection artifact. Read-only; no Apply or mutation.");
  lines.push("");

  lines.push("--- 1. IDENTITY ---");
  lines.push(`ticker: ${plan.ticker}`);
  lines.push(`planId: ${plan.id}`);
  lines.push(`stockThesisId: ${plan.stockThesisId ?? "null"}`);
  lines.push(`playbookId: ${plan.playbookId ?? freeze?.plan.playbookId ?? "null"}`);
  lines.push(`decisionId: ${model.decisionId ?? "null"}`);
  lines.push(`status: ${plan.status}`);
  lines.push("");

  lines.push("--- 2. PLAN GEOMETRY ---");
  lines.push(`plannedEntry: ${fmt(plan.plannedEntry ?? null)}`);
  lines.push(`originalEntry: ${fmt(plan.originalEntry ?? null)}`);
  lines.push(`stopPrice: ${fmt(plan.stopPrice ?? null)}`);
  lines.push(`targetPrice: ${fmt(plan.targetPrice ?? null)}`);
  lines.push(`plannedRR persisted: ${fmtNum(plan.plannedRR ?? null)}`);
  lines.push(`plannedRR geometric: ${fmtNum(model.geometricRR)}`);
  lines.push(`validFrom: ${fmt(plan.validFrom ?? null)}`);
  lines.push(`validUntil: ${fmt(plan.validUntil ?? null)}`);
  lines.push(`executionInstruction: ${fmt(plan.executionInstruction ?? null)}`);
  lines.push("");

  lines.push("--- 3. DECISION / T0 ---");
  lines.push(`decision: ${plan.decision?.verdict ?? freeze?.decision?.verdict ?? "null"}`);
  lines.push(`decidedAt: ${plan.decision?.decidedAt ?? freeze?.decision?.decidedAt ?? "null"}`);
  lines.push(`t0Available: ${thesisCase.t0Evidence.available}`);
  lines.push(`freezeId: ${freeze?.id ?? "null"}`);
  lines.push(`correctionAudit: ${fmtAudit(freeze?.correctionAudit ?? null)}`);
  lines.push(`confidence: ${freeze?.confidence ?? "null"}`);
  lines.push(`correctionAudit: ${fmtAudit(freeze?.correctionAudit ?? null)}`);
  lines.push("");

  lines.push("--- 4. OUTCOME / LEARNING ---");
  lines.push(`outcomeKind: ${fmt(outcome?.outcomeKind ?? null)}`);
  lines.push(`tradeLinked: ${trade ? "true" : "false"}`);
  lines.push(`tradeId: ${trade?.id ?? "null"}`);
  lines.push(`loId: ${learningOutcome?.id ?? "null"}`);
  lines.push(`loKind: ${learningOutcome?.kind ?? "null"}`);
  lines.push(`realizedR: ${fmt(learningOutcome?.realizedR ?? null)}`);
  lines.push(`counterfactualR: ${fmt(learningOutcome?.counterfactualR ?? null)}`);
  lines.push(`outcomeRecordKind: ${fmt(outcome?.recordKind ?? null)}`);
  lines.push(`outcomeCorrectionAudit: ${fmtAudit(outcome?.correctionAudit ?? null)}`);
  lines.push("");

  lines.push("--- 5. CANONICAL CHAIN ---");
  lines.push(`Plan -> ${plan.id} + LINKED`);
  lines.push(`Decision -> ${model.decisionId ?? "MISSING"} + ${model.linkStatuses.decision}`);
  lines.push(`T0 -> ${freeze?.id ?? "MISSING"} + ${model.linkStatuses.t0}`);
  lines.push(`Trade -> ${trade?.id ?? "MISSING"} + ${model.linkStatuses.trade}`);
  lines.push(`Outcome -> ${outcome?.outcomeKind ?? "MISSING"} + ${model.linkStatuses.outcome}`);
  lines.push(`LO -> ${learningOutcome?.id ?? "MISSING"} + ${model.linkStatuses.learningOutcome}`);

  return wrapSnapshotText("Plan Snapshot", lines.join("\n"));
}
