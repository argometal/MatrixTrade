import { buildCaseSnapshotModel } from "./case-snapshot";
import { buildInsightsCaseSpine } from "./insights-case-spine";
import type { InsightsCaseRow } from "./insights-case-spine-types";
import { getImprovementHypothesisById, getImprovementHypothesesByOriginPlanId } from "./improvement-hypothesis-store";
import { getLearningOutcomes } from "./learning-outcome-store";
import { getMafExperiments } from "./maf-store";
import { getObservations } from "./observation-store";
import { analyzeOpportunityConsumption, type OpportunityConsumptionAnalysis } from "./opportunity-consumption";
import { getTrades } from "./storage";
import type { ImprovementHypothesis } from "./improvement-hypothesis-types";
import type { LearningOutcome } from "./learning-outcome-types";
import type { MafExperiment } from "./maf-types";
import type { ObservationRecord } from "./observation-types";
import type { RecordKind } from "./correction-types";
import type { Trade } from "./types";
import { resolveMafForTrade } from "./historical-case-attribution";
import { derivePlanCaseLifecycle, type PlanCaseLifecycle } from "./plan-case-lifecycle";

export type FocusedCaseTimelineItem = {
  label: string;
  value: string | null;
  note?: string | null;
};

export type FocusedCaseReport = {
  caseId: string;
  planId: string;
  caseOrigin: "modern" | "historical_trade";
  generatedAt: string;
  caseHref: string;
  lifecycle: PlanCaseLifecycle;
  identity: {
    ticker: string;
    stockThesisId: string | null;
    playbookId: string | null;
    playbookName: string | null;
    decisionId: string | null;
    decisionVerdict: string | null;
  };
  timeline: {
    createdAt: string | null;
    decidedAt: string | null;
    t0: string | null;
    t0Available: boolean;
    t0RecordKind: RecordKind | null;
    t0Confidence: string | null;
    t0Source: string | null;
    validFrom: string | null;
    validUntil: string | null;
    realityWindow: string | null;
    items: FocusedCaseTimelineItem[];
  };
  frozenPlan: {
    available: boolean;
    plannedEntry: number | null;
    originalEntry: number | null;
    stopPrice: number | null;
    targetPrice: number | null;
    supportLevel: number | null;
    maximumEntryProxy: number | null;
    executionInstruction: string | null;
    recordedRR: number | null;
    geometricRR: number | null;
    rrConsistency: "OK" | "WRONG" | "UNAVAILABLE";
    rrDifference: number | null;
    correctionAudit: unknown;
  };
  reality: {
    entryReached: boolean | null;
    stopReached: boolean | null;
    targetReached: boolean | null;
    eventOrder: string | null;
    relationship: string | null;
    evidence: string | null;
  };
  execution: {
    tradeLinked: boolean;
    tradeId: string | null;
    executionOccurred: boolean;
    nonExecutionReason: string | null;
    planStatus: string | null;
  };
  accounting: {
    realizedR: number | null;
    counterfactualR: number | null;
    realizedPnL: number | null;
  };
  opportunityConsumption: OpportunityConsumptionAnalysis;
  caseClassification: {
    family: string | null;
    subtype: string | null;
    diagnosis: string | null;
    evaluationCode: string | null;
    decisionQuality: string | null;
    executionQuality: string | null;
    realityRelationship: string | null;
    diagnosisReason: string | null;
    evaluable: boolean;
  };
  integrity: {
    warnings: string[];
    unresolved: string[];
    t0Provenance: string | null;
    outcomeCorrectionAudit: unknown;
    missingT0: boolean;
    missingPlan: boolean;
    rrConsistency: "OK" | "WRONG" | "UNAVAILABLE";
  };
  learning: {
    learningOutcomeId: string | null;
    learningOutcomeKind: string | null;
    observationId: string | null;
    observationKind: string | null;
    mafId: string | null;
    mafStatus: string | null;
    mafPrimaryDrag: string | null;
    mafSource: string | null;
  };
  improvement: {
    hypothesisId: string | null;
    targetComponent: string | null;
    status: string | null;
    evidenceCount: number | null;
    verdict: string | null;
  };
};

function formatRealityWindowLabel(input: { id: string; windowKind: string; windowStart: string; windowEnd: string }[]): string | null {
  if (input.length === 0) return null;
  return input
    .map((window) => `${window.windowKind}: ${window.windowStart} -> ${window.windowEnd}`)
    .join(" | ");
}

function explainT0Source(input: { t0Source: string }): string {
  return input.t0Source;
}

function diagnosisValue(row: InsightsCaseRow | null): string | null {
  return row?.diagnosis.classification.value ?? null;
}

function isEvaluable(row: InsightsCaseRow | null): boolean {
  if (!row) return false;
  return row.family === "A" || row.family === "B" || row.family === "C" || row.family === "D";
}

function deriveHistoricalCaseHref(row: InsightsCaseRow): string {
  return row.caseHref;
}

async function buildHistoricalFocusedCaseReport(row: InsightsCaseRow): Promise<FocusedCaseReport | null> {
  const tradeId = row.caseId.toUpperCase().startsWith("HIST:")
    ? row.caseId.slice("HIST:".length)
    : row.caseId;
  const [trades, learningOutcomes, observations, mafExperiments, improvementHypotheses] =
    await Promise.all([
      getTrades(),
      getLearningOutcomes(),
      getObservations(),
      getMafExperiments(),
      getImprovementHypothesesByOriginPlanId(row.planId),
    ]);

  const trade = trades.find((item) => item.id.toUpperCase() === tradeId.toUpperCase()) ?? null;
  if (!trade) return null;
  const learningOutcome =
    learningOutcomes.find((item) => item.tradeId?.toUpperCase() === trade.id.toUpperCase()) ?? null;
  const observation =
    observations.find((item) => item.tradeId?.toUpperCase() === trade.id.toUpperCase()) ?? null;
  const maf = resolveMafForTrade(trade.id, mafExperiments);
  const improvement = improvementHypotheses[0] ?? null;

  const unresolved = [
    "Historical trade-backed Case; no canonical Plan record.",
    "No plan-backed T0 exists for this Case.",
  ];
  if (!learningOutcome) unresolved.push("No linked Learning Outcome.");
  if (!observation) unresolved.push("No linked Observation.");

  return {
    caseId: row.caseId,
    planId: row.planId,
    caseOrigin: "historical_trade",
    generatedAt: new Date().toISOString(),
    caseHref: deriveHistoricalCaseHref(row),
    lifecycle: derivePlanCaseLifecycle({
      caseOrigin: "historical_trade",
      planStatus: null,
      t0Available: false,
      hasValidityWindow: false,
      hasReality: true,
      hasExecutionEvidence: true,
      hasOutcomeEvidence:
        trade.riskRewardActual != null ||
        learningOutcome?.realizedR != null ||
        learningOutcome?.counterfactualR != null,
      classificationComplete: false,
      hasLearningEvidence: Boolean(learningOutcome?.id || observation?.id),
      hasAcceptedMaf: Boolean(maf?.id),
      rrCorrectableIssue: false,
    }),
    identity: {
      ticker: row.ticker,
      stockThesisId: row.stockThesisId,
      playbookId: row.playbookId,
      playbookName: row.playbookId,
      decisionId: null,
      decisionVerdict: null,
    },
    timeline: {
      createdAt: trade.createdAt ?? null,
      decidedAt: null,
      t0: null,
      t0Available: false,
      t0RecordKind: null,
      t0Confidence: null,
      t0Source: null,
      validFrom: null,
      validUntil: null,
      realityWindow: null,
      items: [
        { label: "Trade created", value: trade.createdAt ?? null },
        { label: "T0", value: null, note: "Not available for historical trade-backed Case." },
        { label: "Validity", value: null, note: "No canonical Plan validity window." },
      ],
    },
    frozenPlan: {
      available: false,
      plannedEntry: null,
      originalEntry: null,
      stopPrice: trade.stop ?? null,
      targetPrice: trade.target ?? null,
      supportLevel: null,
      maximumEntryProxy: null,
      executionInstruction: null,
      recordedRR: null,
      geometricRR: null,
      rrConsistency: "UNAVAILABLE",
      rrDifference: null,
      correctionAudit: null,
    },
    reality: {
      entryReached: trade.entry != null ? true : null,
      stopReached: null,
      targetReached: null,
      eventOrder: null,
      relationship: row.reality,
      evidence: row.evidenceSummary,
    },
    execution: {
      tradeLinked: true,
      tradeId: trade.id,
      executionOccurred: true,
      nonExecutionReason: learningOutcome?.nonExecutionReason ?? null,
      planStatus: null,
    },
    accounting: {
      realizedR: trade.riskRewardActual ?? learningOutcome?.realizedR ?? null,
      counterfactualR: learningOutcome?.counterfactualR ?? null,
      realizedPnL: learningOutcome?.realizedPnL ?? null,
    },
    opportunityConsumption: analyzeOpportunityConsumption({
      window: null,
      plannedEntry: null,
      stopPrice: trade.stop ?? null,
      targetPrice: trade.target ?? null,
      plannedRR: null,
      executionOccurred: true,
      learningOutcome,
    }),
    caseClassification: {
      family: row.family,
      subtype: row.caseDSubtype ?? null,
      diagnosis: diagnosisValue(row),
      evaluationCode: row.equationId,
      decisionQuality: row.decisionQuality,
      executionQuality: row.executionQuality,
      realityRelationship: row.reality,
      diagnosisReason: row.diagnosisReason,
      evaluable: isEvaluable(row),
    },
    integrity: {
      warnings: [],
      unresolved,
      t0Provenance: "No plan-backed T0. Historical trade-backed Case only.",
      outcomeCorrectionAudit: null,
      missingT0: true,
      missingPlan: true,
      rrConsistency: "UNAVAILABLE",
    },
    learning: {
      learningOutcomeId: learningOutcome?.id ?? null,
      learningOutcomeKind: learningOutcome?.kind ?? null,
      observationId: observation?.id ?? learningOutcome?.observationId ?? null,
      observationKind: observation?.observationKind ?? null,
      mafId: maf?.id ?? null,
      mafStatus: maf?.status ?? null,
      mafPrimaryDrag: maf?.primaryDragComponent ?? null,
      mafSource: maf?.source ?? null,
    },
    improvement: {
      hypothesisId: improvement?.id ?? null,
      targetComponent: improvement?.componentId ?? null,
      status: improvement?.status ?? null,
      evidenceCount: improvement ? improvement.evidencePlanIds.length : null,
      verdict: improvement?.evidenceVerdictNote ?? null,
    },
  };
}

function pickImprovement(model: Awaited<ReturnType<typeof buildCaseSnapshotModel>>, explicit: ImprovementHypothesis | null): ImprovementHypothesis | null {
  if (!model) return explicit;
  return explicit ?? model.improvement ?? null;
}

function reachToBool(value: boolean | string | null | undefined): boolean | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  if (value === "YES") return true;
  if (value === "NO") return false;
  return null;
}

export async function buildFocusedCaseReport(caseIdentity: string): Promise<FocusedCaseReport | null> {
  const caseSpine = await buildInsightsCaseSpine();
  const key = caseIdentity.trim().toUpperCase();
  const row =
    caseSpine.find((item) => item.planId.toUpperCase() === key) ??
    caseSpine.find((item) => item.caseId.toUpperCase() === key) ??
    null;
  if (!row) return null;

  if (row.caseOrigin === "historical_trade") {
    return buildHistoricalFocusedCaseReport(row);
  }

  const model = await buildCaseSnapshotModel(row.planId);
  if (!model) return null;
  const improvement = pickImprovement(
    model,
    model.plan.improvementHypothesisId
      ? (await getImprovementHypothesisById(model.plan.improvementHypothesisId)) ?? null
      : null
  );
  const freeze = model.thesisCase.freeze;
  const outcome = model.plan.outcome ?? null;
  const t0Plan = model.thesisCase.t0Evidence.plan;
  const retrospective = model.retrospectiveView.summary;
  const primary = model.realityView.summary;
  const unresolved = [...model.integrityWarnings];
  if (!model.thesisCase.t0Evidence.available) {
    unresolved.push(
      model.thesisCase.t0Evidence.reason ??
        "No T0 freeze for this plan — decision-time snapshot not preserved."
    );
  }
  if (model.caseRow?.missingInputs.length) {
    unresolved.push(`Missing case inputs: ${model.caseRow.missingInputs.join(", ")}`);
  }
  const lifecycle = derivePlanCaseLifecycle({
    caseOrigin: "modern",
    planStatus: model.plan.status,
    t0Available: model.thesisCase.t0Evidence.available,
    hasValidityWindow: Boolean(model.plan.validFrom || model.plan.validUntil),
    hasReality:
      model.evaluation.realityRelationship.value !== "INDETERMINATE" ||
      model.thesisCase.postDecision.marketReality.observations.length > 0 ||
      model.realityWindows.length > 0,
    hasExecutionEvidence:
      Boolean(model.trade) ||
      Boolean(outcome?.outcomeKind) ||
      Boolean(outcome?.nonExecutionReason) ||
      Boolean(model.learningOutcome?.kind),
    hasOutcomeEvidence:
      Boolean(outcome?.recordedAt) ||
      Boolean(model.learningOutcome?.kind) ||
      model.trade?.riskRewardActual != null ||
      outcome?.theoreticalResultR != null,
    classificationComplete: Boolean(model.caseRow && model.caseRow.family !== "INDETERMINATE"),
    hasLearningEvidence: Boolean(model.learningOutcome?.id || model.observation?.id),
    hasAcceptedMaf: Boolean(model.maf?.id),
    rrCorrectableIssue: model.rrConsistency === "WRONG",
    rrIssueNote:
      model.rrConsistency === "WRONG"
        ? `Persisted plannedRR ${model.plan.plannedRR ?? "—"} != geometric ${
            model.geometricRR == null ? "—" : Number(model.geometricRR.toFixed(4))
          }.`
        : null,
  });
  const opportunityConsumption = analyzeOpportunityConsumption({
    window:
      model.retrospectiveView.window ??
      model.realityView.window ??
      null,
    plannedEntry: t0Plan?.plannedEntry ?? model.plan.plannedEntry ?? null,
    stopPrice: t0Plan?.stopPrice ?? model.plan.stopPrice ?? null,
    targetPrice: t0Plan?.targetPrice ?? model.plan.targetPrice ?? null,
    plannedRR: t0Plan?.plannedRR ?? model.plan.plannedRR ?? model.geometricRR,
    executionOccurred: Boolean(model.trade),
    learningOutcome: model.learningOutcome,
  });

  return {
    caseId: model.caseRow?.caseId ?? model.plan.id,
    planId: model.plan.id,
    caseOrigin: "modern",
    generatedAt: model.generatedAt,
    caseHref: model.caseRow?.caseHref ?? `/mxt/scout/case?plan=${encodeURIComponent(model.plan.id)}`,
    lifecycle,
    identity: {
      ticker: model.plan.ticker,
      stockThesisId: model.plan.stockThesisId ?? null,
      playbookId: model.plan.playbookId ?? freeze?.plan.playbookId ?? null,
      playbookName: model.playbookName,
      decisionId: model.decisionId,
      decisionVerdict:
        model.plan.decision?.verdict ?? model.thesisCase.t0Evidence.decision?.verdict ?? null,
    },
    timeline: {
      createdAt: model.plan.createdAt ?? null,
      decidedAt:
        model.plan.decision?.decidedAt ?? model.thesisCase.t0Evidence.decision?.decidedAt ?? null,
      t0: freeze?.t0 ?? null,
      t0Available: model.thesisCase.t0Evidence.available,
      t0RecordKind: null,
      t0Confidence: freeze?.confidence ?? null,
      t0Source: freeze
        ? explainT0Source({
            t0Source: model.thesisCase.temporalIntegrity.t0Source,
          })
        : model.thesisCase.temporalIntegrity.t0Source,
      validFrom: model.plan.validFrom ?? null,
      validUntil: model.plan.validUntil ?? null,
      realityWindow: formatRealityWindowLabel(model.realityWindows),
      items: [
        { label: "Created", value: model.plan.createdAt ?? null },
        {
          label: "Decision",
          value:
            model.plan.decision?.decidedAt ??
            model.thesisCase.t0Evidence.decision?.decidedAt ??
            null,
          note: model.decisionId ?? null,
        },
        {
          label: "T0",
          value: freeze?.t0 ?? null,
          note: model.thesisCase.t0Evidence.available ? freeze?.confidence ?? null : "missing",
        },
        { label: "Valid From", value: model.plan.validFrom ?? null },
        { label: "Valid Until", value: model.plan.validUntil ?? null },
        { label: "Reality Window", value: formatRealityWindowLabel(model.realityWindows) },
      ],
    },
    frozenPlan: {
      available: true,
      plannedEntry: t0Plan?.plannedEntry ?? model.plan.plannedEntry ?? null,
      originalEntry: model.plan.originalEntry ?? null,
      stopPrice: t0Plan?.stopPrice ?? model.plan.stopPrice ?? null,
      targetPrice: t0Plan?.targetPrice ?? model.plan.targetPrice ?? null,
      supportLevel: model.plan.supportLevel ?? null,
      maximumEntryProxy: t0Plan?.maximumEntryProxy ?? null,
      executionInstruction: t0Plan?.executionInstruction ?? model.plan.executionInstruction ?? null,
      recordedRR: t0Plan?.plannedRR ?? model.plan.plannedRR ?? null,
      geometricRR: model.geometricRR,
      rrConsistency: model.rrConsistency,
      rrDifference: model.rrDifference,
      correctionAudit: freeze?.correctionAudit ?? null,
    },
    reality: {
      entryReached: reachToBool(
        outcome?.entryReached ?? primary?.entryLevelReached ?? retrospective?.entryLevelReached ?? null
      ),
      stopReached: reachToBool(
        outcome?.stopTriggered ??
          model.observation?.stopTriggered ??
          primary?.stopLevelReached ??
          retrospective?.stopLevelReached ??
          null
      ),
      targetReached: reachToBool(
        outcome?.targetTriggered ??
          model.observation?.targetTriggered ??
          primary?.targetReached ??
          retrospective?.targetReached ??
          null
      ),
      eventOrder: model.observation?.firstTerminalEvent ?? null,
      relationship: model.caseRow?.reality ?? model.evaluation.realityRelationship.value,
      evidence:
        [
          model.realityView.window?.id ?? null,
          model.retrospectiveView.window?.id ?? null,
          model.observation?.id ?? null,
        ]
          .filter(Boolean)
          .join(" | ") || null,
    },
    execution: {
      tradeLinked: Boolean(model.trade),
      tradeId: model.trade?.id ?? null,
      executionOccurred: Boolean(model.trade),
      nonExecutionReason:
        outcome?.nonExecutionReason ?? model.learningOutcome?.nonExecutionReason ?? null,
      planStatus: model.plan.status,
    },
    accounting: {
      realizedR:
        model.trade?.riskRewardActual ??
        outcome?.realizedResultR ??
        model.learningOutcome?.realizedR ??
        null,
      counterfactualR:
        outcome?.theoreticalResultR ?? model.learningOutcome?.counterfactualR ?? null,
      realizedPnL:
        outcome?.realizedPnL ?? model.learningOutcome?.realizedPnL ?? null,
    },
    opportunityConsumption,
    caseClassification: {
      family: model.caseRow?.family ?? null,
      subtype: model.caseRow?.caseDSubtype ?? null,
      diagnosis: diagnosisValue(model.caseRow),
      evaluationCode: model.caseRow?.equationId ?? null,
      decisionQuality:
        model.caseRow?.decisionQuality ?? model.evaluation.decisionQuality.value,
      executionQuality:
        model.caseRow?.executionQuality ?? model.evaluation.executionQuality.value,
      realityRelationship:
        model.caseRow?.reality ?? model.evaluation.realityRelationship.value,
      diagnosisReason: model.caseRow?.diagnosisReason ?? null,
      evaluable: isEvaluable(model.caseRow),
    },
    integrity: {
      warnings: model.integrityWarnings,
      unresolved,
      t0Provenance: freeze
        ? freeze.confidence ?? "available"
        : "missing",
      outcomeCorrectionAudit: outcome?.correctionAudit ?? null,
      missingT0: !model.thesisCase.t0Evidence.available,
      missingPlan: false,
      rrConsistency: model.rrConsistency,
    },
    learning: {
      learningOutcomeId: model.learningOutcome?.id ?? null,
      learningOutcomeKind: model.learningOutcome?.kind ?? null,
      observationId: model.observation?.id ?? model.learningOutcome?.observationId ?? null,
      observationKind: model.observation?.observationKind ?? null,
      mafId: model.maf?.id ?? null,
      mafStatus: model.maf?.status ?? null,
      mafPrimaryDrag: model.maf?.primaryDragComponent ?? null,
      mafSource: model.maf?.source ?? null,
    },
    improvement: {
      hypothesisId: improvement?.id ?? model.plan.improvementHypothesisId ?? null,
      targetComponent: improvement?.componentId ?? null,
      status: improvement?.status ?? null,
      evidenceCount: improvement ? improvement.evidencePlanIds.length : null,
      verdict: improvement?.evidenceVerdictNote ?? null,
    },
  };
}
