/**
 * Prompt #10 — Edge Decomposition Engine.
 * Pure read projection over ThesisCase — no persistence, scores, or attribution.
 */

import type { ThesisCase } from "./thesis-case-types";
import { buildCase, type BuildCaseDeps } from "./thesis-case";
import type {
  EdgeAnalyticalOrdering,
  EdgeControllableLayer,
  EdgeDecomposition,
  EdgeExternalConditionsLayer,
  EdgeOutcomeLayer,
  EdgeThesisLayer,
  EdgeUncertaintyLayer,
  EvidenceAvailability,
  ThesisRealityRelationship,
} from "./edge-decomposition-types";

const ANALYTICAL_ORDERING: EdgeAnalyticalOrdering = {
  controlFirst: true,
  thenAdapt: true,
  thenAcceptUncertainty: true,
  note: "CONTROL controllable process first → ADAPT rules to recurring external conditions when evidenced → ACCEPT residual uncertainty. Do not optimize isolated outcomes.",
};

function emptyControllable(
  evidenceAvailable: EvidenceAvailability
): EdgeControllableLayer {
  return {
    evidenceAvailable,
    plan: {
      planId: null,
      plannedEntry: null,
      maximumEntryProxy: null,
      stopPrice: null,
      targetPrice: null,
      plannedRR: null,
      layeredEntry: null,
      executionInstruction: null,
    },
    decision: {
      decisionId: null,
      decidedAt: null,
      verdict: null,
      reasoning: null,
      challenges: [],
    },
    execution: {
      kind: "unknown",
      tradeId: null,
      disposition: null,
      actualEntry: null,
      actualExit: null,
      actualStop: null,
      actualTarget: null,
    },
    risk: {
      plannedStop: null,
      plannedTarget: null,
      plannedRR: null,
      invalidationText: null,
      minimumRR: null,
    },
  };
}

function thesisLayer(c: ThesisCase): EdgeThesisLayer {
  const blind = c.t0Evidence;
  if (!blind.available || blind.integrity === "unavailable") {
    return {
      evidenceAvailable: "unavailable",
      variables: {
        thesisText: null,
        currentHypothesis: null,
        levels: null,
        riskRules: null,
        stockThesisVersion: null,
        evaluationHorizonDays: c.identity.evaluationHorizonDays,
        evaluationHorizonEndsAt: c.identity.evaluationHorizonEndsAt,
      },
      realityRelationship: "unknown",
    };
  }

  const pre = blind.preEvent;
  const evidenceAvailable: EvidenceAvailability =
    blind.integrity === "partial" ? "partial" : "available";

  return {
    evidenceAvailable,
    variables: {
      thesisText: pre?.thesis ?? null,
      currentHypothesis: pre?.currentHypothesis ?? null,
      levels: pre?.levels ?? null,
      riskRules: pre?.riskRules ?? null,
      stockThesisVersion: pre?.stockThesisVersion ?? null,
      evaluationHorizonDays: c.identity.evaluationHorizonDays,
      evaluationHorizonEndsAt: c.identity.evaluationHorizonEndsAt,
    },
    realityRelationship: relateThesisToReality(c),
  };
}

/**
 * Descriptive only. Never invent consistency without market/outcome evidence.
 * Does not rewrite T0 thesis assessment.
 */
function relateThesisToReality(c: ThesisCase): ThesisRealityRelationship {
  const mr = c.postDecision.marketReality;
  const hasObsSignal =
    mr.observations.some(
      (o) =>
        o.targetReached != null ||
        o.thesisInvalidated != null ||
        o.maxPrice != null ||
        o.minPrice != null ||
        o.firstTerminalEvent != null
    ) || mr.horizonExpired;

  const hasOutcomeSignal =
    c.postDecision.outcome.planOutcome != null ||
    c.postDecision.learningEvidence.learningOutcome != null;

  if (!hasObsSignal && !hasOutcomeSignal) {
    return "unknown";
  }

  const invalidated = mr.observations.some((o) => o.thesisInvalidated === true);
  const targetHit = mr.observations.some((o) => o.targetReached === true);
  const lo = c.postDecision.learningEvidence.learningOutcome;

  if (invalidated) return "inconsistent";
  if (targetHit) return "consistent";
  if (lo?.kind === "executed_win" || lo?.kind === "missed_opportunity") {
    // Kind alone does not prove thesis direction — insufficient without path evidence.
    return "insufficient_to_evaluate";
  }
  if (lo?.kind === "executed_loss" || lo?.kind === "unexecuted_plan_loss") {
    return "insufficient_to_evaluate";
  }
  if (mr.completeness === "unavailable" || mr.completeness === "incomplete") {
    return "insufficient_to_evaluate";
  }
  return "insufficient_to_evaluate";
}

function controllableLayer(c: ThesisCase): EdgeControllableLayer {
  const blind = c.t0Evidence;
  const reveal = c.postDecision;

  // Execution may be known from post-decision even when T0 is unavailable.
  const executionFromPostDecision = (): EdgeControllableLayer["execution"] => {
    if (reveal.execution.kind === "trade") {
      return {
        kind: "trade",
        tradeId: reveal.execution.tradeId,
        disposition: null,
        actualEntry: reveal.execution.entry,
        actualExit: reveal.execution.exit,
        actualStop: reveal.execution.stop,
        actualTarget: reveal.execution.target,
      };
    }
    if (reveal.execution.kind === "no_trade") {
      return {
        kind: "no_trade",
        tradeId: null,
        disposition: reveal.execution.disposition,
        actualEntry: null,
        actualExit: null,
        actualStop: null,
        actualTarget: null,
      };
    }
    return {
      kind: "unknown",
      tradeId: null,
      disposition: null,
      actualEntry: null,
      actualExit: null,
      actualStop: null,
      actualTarget: null,
    };
  };

  if (!blind.available || blind.integrity === "unavailable") {
    const base = emptyControllable("unavailable");
    // E: unavailable T0 cannot fabricate plan/decision/risk from live Stock File.
    // Execution kind from post-decision is allowed (factual post-event), not T0 geometry.
    return {
      ...base,
      execution: executionFromPostDecision(),
    };
  }

  const evidenceAvailable: EvidenceAvailability =
    blind.integrity === "partial" ? "partial" : "available";
  const plan = blind.plan;
  const decision = blind.decision;
  const riskRules = blind.preEvent?.riskRules ?? null;

  return {
    evidenceAvailable,
    plan: {
      planId: plan?.planId ?? null,
      plannedEntry: plan?.plannedEntry ?? null,
      maximumEntryProxy: plan?.maximumEntryProxy ?? null,
      stopPrice: plan?.stopPrice ?? null,
      targetPrice: plan?.targetPrice ?? null,
      plannedRR: plan?.plannedRR ?? null,
      layeredEntry: plan?.layeredEntry ?? null,
      executionInstruction: plan?.executionInstruction ?? null,
    },
    decision: {
      decisionId: decision?.decisionId ?? null,
      decidedAt: decision?.decidedAt ?? null,
      verdict: decision?.verdict ?? null,
      reasoning: decision?.reasoning ?? null,
      challenges: decision?.challenges ? [...decision.challenges] : [],
    },
    execution: executionFromPostDecision(),
    risk: {
      plannedStop: plan?.stopPrice ?? null,
      plannedTarget: plan?.targetPrice ?? null,
      plannedRR: plan?.plannedRR ?? null,
      invalidationText: riskRules?.invalidation ?? null,
      minimumRR: riskRules?.minimumRR ?? null,
    },
  };
}

function externalLayer(c: ThesisCase): EdgeExternalConditionsLayer {
  const mr = c.postDecision.marketReality;
  const obs = mr.observations;
  if (mr.completeness === "unavailable" && obs.length === 0) {
    return {
      evidenceAvailable: "unavailable",
      variables: {
        observationCount: 0,
        maxPrice: null,
        minPrice: null,
        targetReached: null,
        thesisInvalidated: null,
        firstTerminalEvent: null,
        horizonExpired: mr.horizonExpired || null,
        volatility: null,
        pullbackDepth: null,
        timeToExpectedMove: null,
        mfe: null,
        mae: null,
        gapBehavior: null,
        marketRegime: null,
      },
    };
  }

  const maxes = obs
    .map((o) => o.maxPrice)
    .filter((n): n is number => n != null);
  const mins = obs
    .map((o) => o.minPrice)
    .filter((n): n is number => n != null);
  const targetReached = obs.some((o) => o.targetReached === true)
    ? true
    : obs.some((o) => o.targetReached === false)
      ? false
      : null;
  const thesisInvalidated = obs.some((o) => o.thesisInvalidated === true)
    ? true
    : obs.some((o) => o.thesisInvalidated === false)
      ? false
      : null;
  const terminal =
    obs.find((o) => o.firstTerminalEvent)?.firstTerminalEvent ?? null;

  const evidenceAvailable: EvidenceAvailability =
    mr.completeness === "available"
      ? "available"
      : mr.completeness === "incomplete"
        ? "partial"
        : "unavailable";

  return {
    evidenceAvailable,
    variables: {
      observationCount: obs.length,
      maxPrice: maxes.length ? Math.max(...maxes) : null,
      minPrice: mins.length ? Math.min(...mins) : null,
      targetReached,
      thesisInvalidated,
      firstTerminalEvent: terminal,
      horizonExpired: mr.horizonExpired,
      volatility: null,
      pullbackDepth: null,
      timeToExpectedMove: null,
      mfe: null,
      mae: null,
      gapBehavior: null,
      marketRegime: null,
    },
  };
}

function outcomeLayer(c: ThesisCase): EdgeOutcomeLayer {
  const po = c.postDecision.outcome.planOutcome;
  const lo = c.postDecision.learningEvidence.learningOutcome;
  const exec = c.postDecision.execution;
  const execKind = exec.kind;
  const hasCanonicalOutcome = po != null || lo != null || execKind === "trade";
  const hasNoTradeOnly = execKind === "no_trade";

  if (!hasCanonicalOutcome && !hasNoTradeOnly) {
    return {
      evidenceAvailable: "unavailable",
      variables: {
        executionKind: "unknown",
        planOutcomePresent: false,
        planOutcomeStatus: null,
        planOutcomeKind: null,
        tradeExecuted: null,
        realizedResultR: null,
        realizedPnL: null,
        theoreticalResultR: null,
        nonExecutionReason: null,
        episodeStatus: c.identity.episodeStatus,
        t1: c.identity.t1,
        horizonExpired: c.postDecision.marketReality.horizonExpired,
        learningOutcomeKind: null,
      },
    };
  }

  const evidenceAvailable: EvidenceAvailability = hasCanonicalOutcome
    ? "available"
    : "partial";

  return {
    evidenceAvailable,
    variables: {
      executionKind: execKind,
      planOutcomePresent: po != null,
      planOutcomeStatus: po?.status ?? null,
      planOutcomeKind: po?.outcomeKind ?? null,
      tradeExecuted:
        po?.tradeExecuted ??
        (execKind === "trade" ? true : execKind === "no_trade" ? false : null),
      realizedResultR:
        po?.realizedResultR ??
        (exec.kind === "trade" ? exec.riskRewardActual : null) ??
        null,
      realizedPnL: po?.realizedPnL ?? null,
      theoreticalResultR: po?.theoreticalResultR ?? null,
      nonExecutionReason: po?.nonExecutionReason ?? null,
      episodeStatus: c.identity.episodeStatus,
      t1: c.identity.t1,
      horizonExpired: c.postDecision.marketReality.horizonExpired,
      learningOutcomeKind: lo?.kind ?? null,
    },
  };
}

function uncertaintyLayer(
  c: ThesisCase,
  thesis: EdgeThesisLayer,
  controllable: EdgeControllableLayer,
  external: EdgeExternalConditionsLayer,
  outcome: EdgeOutcomeLayer
): EdgeUncertaintyLayer {
  const reasons: string[] = [];

  if (!c.temporalIntegrity.freezeAvailable) {
    reasons.push("No T0 freeze — thesis-at-decision unavailable.");
  } else if (c.temporalIntegrity.confidence === "unavailable") {
    reasons.push("T0 reconstruction unavailable — no hindsight Stock File fill.");
  } else if (c.temporalIntegrity.confidence === "partial") {
    reasons.push("T0 confidence PARTIAL — incomplete contemporaneous snapshot.");
  }

  if (thesis.evidenceAvailable === "unavailable") {
    reasons.push("Thesis layer evidence unavailable.");
  }
  if (controllable.evidenceAvailable === "unavailable") {
    reasons.push(
      "Controllable plan/decision geometry unavailable without T0 freeze."
    );
  }
  if (
    external.evidenceAvailable === "unavailable" ||
    external.evidenceAvailable === "unknown"
  ) {
    reasons.push("External market-condition evidence unavailable.");
  }
  if (
    outcome.evidenceAvailable === "unavailable" ||
    (outcome.evidenceAvailable === "partial" &&
      !outcome.variables.planOutcomePresent)
  ) {
    reasons.push("Outcome evidence incomplete or unavailable.");
  }
  if (thesis.realityRelationship === "unknown") {
    reasons.push("Thesis↔reality relationship unknown (insufficient evidence).");
  }
  if (thesis.realityRelationship === "insufficient_to_evaluate") {
    reasons.push("Thesis↔reality insufficient to evaluate — residual uncertainty.");
  }

  // Always leave room for residual / unattributed uncertainty
  if (reasons.length === 0) {
    reasons.push(
      "Residual / unattributed uncertainty — do not force process explanation."
    );
  }

  return {
    unresolved: true,
    reasons,
  };
}

/**
 * Deterministic Edge Decomposition from an already-built ThesisCase.
 * No mutation. No GOOD/BAD labels. No aggregate conclusions.
 */
export function decomposeEdge(c: ThesisCase): EdgeDecomposition {
  const thesis = thesisLayer(c);
  const controllable = controllableLayer(c);
  const externalConditions = externalLayer(c);
  const outcome = outcomeLayer(c);
  const uncertainty = uncertaintyLayer(
    c,
    thesis,
    controllable,
    externalConditions,
    outcome
  );

  return {
    caseIdentity: { ...c.identity },
    integrity: { ...c.temporalIntegrity },
    thesis,
    controllable,
    externalConditions,
    outcome,
    uncertainty,
    analyticalOrdering: ANALYTICAL_ORDERING,
    sourceAnchorPlanId: c.identity.anchorPlanId,
  };
}

/** Build Case then decompose — still read-only vs persistence (Case builder may expire horizons). */
export async function decomposeEdgeForPlan(
  planId: string,
  deps?: BuildCaseDeps
): Promise<EdgeDecomposition | null> {
  const c = await buildCase(planId, { ...deps, skipExpire: deps?.skipExpire ?? true });
  if (!c) return null;
  return decomposeEdge(c);
}
