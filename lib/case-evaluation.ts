/**
 * Case Evaluation — Decision / Execution / Reality / Outcome lanes (MXT 016-P04).
 * Verifiable: non-INDETERMINATE conclusions require T0 → Reality → result evidence links.
 * Outcome facts never write Decision Quality.
 */

import type { ThesisCase } from "./thesis-case-types";
import type {
  CaseEvaluation,
  CaseOhlcvEvidence,
  DecisionQuality,
  EvaluationEvidenceLink,
  EvaluationLane,
  ExecutionQuality,
  RealityRelationshipLane,
} from "./case-evaluation-types";

const OUTCOME_ISOLATION =
  "not used for Decision Quality (outcome contamination guard)";

function lane<T extends string>(
  value: T,
  evidence: EvaluationEvidenceLink[]
): EvaluationLane<T> {
  return { value, evidence };
}

function indeterminateDecision(reason: string): EvaluationLane<DecisionQuality> {
  return lane("INDETERMINATE", [
    {
      t0Ref: "unavailable or insufficient",
      realityRef: OUTCOME_ISOLATION,
      note: reason,
    },
  ]);
}

/** Count recoverable T0 decision-support criteria (not outcome). */
function collectT0SupportRefs(c: ThesisCase): string[] {
  const refs: string[] = [];
  const d = c.freeze?.decision ?? null;
  const pre = c.t0Evidence.preEvent;
  if (d?.reasoning?.trim()) refs.push(`reasoning: ${d.reasoning.trim()}`);
  if (d?.challenges?.length) {
    refs.push(`challenges(${d.challenges.length}): ${d.challenges.join("; ")}`);
  }
  if (d?.planningRisk && Object.keys(d.planningRisk).length > 0) {
    refs.push(`planningRisk: ${JSON.stringify(d.planningRisk)}`);
  }
  if (d?.executionRisk && Object.keys(d.executionRisk).length > 0) {
    refs.push(`executionRisk: ${JSON.stringify(d.executionRisk)}`);
  }
  if (d?.locationEvidence?.trim()) {
    refs.push(`locationEvidence: ${d.locationEvidence.trim()}`);
  }
  if (d?.confirmationEvidence?.trim()) {
    refs.push(`confirmationEvidence: ${d.confirmationEvidence.trim()}`);
  }
  if (d?.confirmationCost && Object.keys(d.confirmationCost).length > 0) {
    refs.push(`confirmationCost: ${JSON.stringify(d.confirmationCost)}`);
  }
  if (d?.decisionConfidence != null) {
    refs.push(`decisionConfidence: ${d.decisionConfidence}`);
  }
  if (d?.opportunityQuality != null) {
    refs.push(`opportunityQuality: ${d.opportunityQuality}`);
  }
  if (d?.thesisQuality != null) {
    refs.push(`thesisQuality: ${d.thesisQuality}`);
  }
  if (pre?.currentHypothesis?.trim()) {
    refs.push(`hypothesis@T0: ${pre.currentHypothesis.trim()}`);
  }
  if (pre?.riskRules?.invalidation?.trim()) {
    refs.push(`invalidation@T0: ${pre.riskRules.invalidation.trim()}`);
  }
  if (pre?.levels?.primaryZone) {
    refs.push(
      `primaryZone@T0: ${pre.levels.primaryZone.low}-${pre.levels.primaryZone.high}`
    );
  }
  return refs;
}

function evaluateDecisionQuality(c: ThesisCase): EvaluationLane<DecisionQuality> {
  if (!c.t0Evidence.available || !c.t0Evidence.decision || !c.freeze?.decision) {
    return indeterminateDecision(
      "No usable T0 freeze — Decision Quality is INDETERMINATE; live Thesis/Plan are not used to reconstruct T0."
    );
  }

  const refs = collectT0SupportRefs(c);
  const verdict = c.t0Evidence.decision.verdict;
  const hasReasoning = Boolean(c.freeze.decision.reasoning?.trim());
  const hasChallenges = (c.freeze.decision.challenges?.length ?? 0) > 0;
  const hasStructured =
    Boolean(c.freeze.decision.planningRisk) ||
    Boolean(c.freeze.decision.locationEvidence?.trim()) ||
    Boolean(c.freeze.decision.confirmationEvidence?.trim()) ||
    Boolean(c.t0Evidence.preEvent?.riskRules?.invalidation?.trim()) ||
    Boolean(c.t0Evidence.preEvent?.levels?.primaryZone) ||
    Boolean(c.t0Evidence.preEvent?.currentHypothesis?.trim());

  if (refs.length === 0) {
    return lane("not_supported", [
      {
        t0Ref: `verdict=${verdict} only — no recoverable criteria`,
        realityRef: OUTCOME_ISOLATION,
        note: "Decision recorded without reasoning, challenges, risks, or thesis criteria at T0.",
      },
    ]);
  }

  if (hasReasoning && (hasChallenges || hasStructured)) {
    return lane("supported", [
      {
        t0Ref: refs.slice(0, 4).join(" | "),
        realityRef: OUTCOME_ISOLATION,
        note: "Verdict accompanied by recoverable decision criteria frozen at T0.",
      },
    ]);
  }

  if (hasReasoning || hasChallenges || hasStructured) {
    return lane("weakly_supported", [
      {
        t0Ref: refs.slice(0, 3).join(" | "),
        realityRef: OUTCOME_ISOLATION,
        note: "Partial criteria at T0 — thin support, not empty.",
      },
    ]);
  }

  return lane("not_supported", [
    {
      t0Ref: refs.join(" | ") || `verdict=${verdict}`,
      realityRef: OUTCOME_ISOLATION,
      note: "Insufficient criteria to treat decision as supported at T0.",
    },
  ]);
}

function maxAuthorizedEntry(c: ThesisCase): number | null {
  const plan = c.t0Evidence.plan;
  if (!plan) return null;
  if (plan.maximumEntryProxy != null && Number.isFinite(plan.maximumEntryProxy)) {
    return plan.maximumEntryProxy;
  }
  if (plan.plannedEntry != null && Number.isFinite(plan.plannedEntry)) {
    return plan.plannedEntry;
  }
  return null;
}

function evaluateExecutionQuality(c: ThesisCase): EvaluationLane<ExecutionQuality> {
  const ex = c.postDecision.execution;
  const plan = c.t0Evidence.plan;

  if (ex.kind === "no_trade") {
    return lane("not_applicable", [
      {
        t0Ref: plan
          ? `plan geometry entry=${plan.plannedEntry} stop=${plan.stopPrice}`
          : "no T0 plan geometry",
        realityRef: `no_trade disposition=${ex.disposition ?? "—"}`,
        note: "No execution — Execution Quality not applicable.",
      },
    ]);
  }

  if (!c.t0Evidence.available || !plan) {
    return lane("INDETERMINATE", [
      {
        t0Ref: "T0 plan geometry unavailable",
        realityRef: `trade ${ex.tradeId} entry=${ex.entry}`,
        note: "Cannot judge execution against Plan without T0 geometry.",
      },
    ]);
  }

  if (ex.entry == null || !Number.isFinite(ex.entry)) {
    return lane("INDETERMINATE", [
      {
        t0Ref: `maxEntry=${maxAuthorizedEntry(c)} stop=${plan.stopPrice}`,
        realityRef: `trade ${ex.tradeId} entry missing`,
        note: "Trade present but entry price unknown.",
      },
    ]);
  }

  const maxEntry = maxAuthorizedEntry(c);
  if (maxEntry != null && ex.entry > maxEntry + 1e-9) {
    return lane("violated", [
      {
        t0Ref: `authorized max entry ${maxEntry} (maximumEntryProxy|plannedEntry @ T0)`,
        realityRef: `fill entry ${ex.entry} on ${ex.tradeId}`,
        note: "Execution above authorized entry geometry.",
      },
    ]);
  }

  // Stop respect: if exitReason indicates stop and stop known, treat as respected geometry.
  const stop = plan.stopPrice;
  const exitReason = (ex.exitReason ?? "").toLowerCase();
  const stopped =
    exitReason.includes("stop") ||
    (stop != null &&
      ex.exit != null &&
      Number.isFinite(ex.exit) &&
      Math.abs(ex.exit - stop) <= Math.max(0.01, Math.abs(stop) * 0.002));

  if (maxEntry != null && ex.entry <= maxEntry + 1e-9) {
    return lane("respected", [
      {
        t0Ref: `authorized max entry ${maxEntry}; stop ${stop ?? "—"}`,
        realityRef: `fill entry ${ex.entry}${stopped ? `; exit ${ex.exit} (~stop)` : ""}`,
        note: stopped
          ? "Fill within authorized entry; exit consistent with stop geometry."
          : "Fill within authorized entry geometry.",
      },
    ]);
  }

  return lane("INDETERMINATE", [
    {
      t0Ref: `plannedEntry=${plan.plannedEntry} max=${maxEntry}`,
      realityRef: `entry=${ex.entry}`,
      note: "Insufficient geometry to classify execution respect.",
    },
  ]);
}

function ohlcvForCase(
  c: ThesisCase,
  ohlcv: CaseOhlcvEvidence | null | undefined
): CaseOhlcvEvidence | null {
  if (!ohlcv || !ohlcv.available) return null;
  if (ohlcv.planId.toUpperCase() !== c.identity.anchorPlanId.toUpperCase()) {
    return null;
  }
  return ohlcv;
}

function evaluateRealityRelationship(
  c: ThesisCase,
  ohlcv: CaseOhlcvEvidence | null | undefined
): EvaluationLane<RealityRelationshipLane> {
  if (!c.t0Evidence.available) {
    return lane("INDETERMINATE", [
      {
        t0Ref: "no T0 freeze",
        realityRef: "ignored for relationship without T0 anchors",
        note: "Reality Relationship requires T0 conditions to compare against.",
      },
    ]);
  }

  const mr = c.postDecision.marketReality;
  const obs = mr.observations.filter((o) => o.observedAfterT0);
  const invalidatedObs = obs.some((o) => o.thesisInvalidated === true);
  const targetObs = obs.some((o) => o.targetReached === true);
  const hasPath =
    obs.some(
      (o) =>
        o.maxPrice != null ||
        o.minPrice != null ||
        o.targetReached != null ||
        o.thesisInvalidated != null ||
        o.firstTerminalEvent != null
    ) || mr.horizonExpired;

  const attached = ohlcvForCase(c, ohlcv);
  const zoneYes = attached?.thesisZoneReached === "YES";
  const zoneNo = attached?.thesisZoneReached === "NO";
  const targetYes = attached?.targetReached === "YES";
  const targetNo = attached?.targetReached === "NO";
  const stopYes = attached?.stopLevelReached === "YES";

  const t0Inv = c.t0Evidence.preEvent?.riskRules?.invalidation?.trim() ?? null;
  const zone = c.t0Evidence.preEvent?.levels?.primaryZone ?? null;
  const verdict = c.t0Evidence.decision?.verdict ?? null;
  const t0Target = c.t0Evidence.plan?.targetPrice ?? null;

  // Prefer OBS for invalidation / target; OHLCV only when OBS path empty.
  if (invalidatedObs && targetObs) {
    return lane("mixed", [
      {
        t0Ref: t0Inv
          ? `invalidation@T0: ${t0Inv}; target@T0: ${t0Target}`
          : `target@T0: ${t0Target}`,
        realityRef: "OBS thesisInvalidated=true and targetReached=true",
        note: "Both invalidation and target signals present in Observations.",
      },
    ]);
  }

  if (invalidatedObs) {
    return lane("invalidated", [
      {
        t0Ref: t0Inv ?? "invalidation criterion not textually frozen; OBS flag used",
        realityRef: "OBS thesisInvalidated=true after T0",
        note: "Observation records thesis invalidation after decision.",
      },
    ]);
  }

  if (targetObs) {
    return lane("condition_met", [
      {
        t0Ref: t0Target != null ? `target@T0: ${t0Target}` : "target geometry @ T0",
        realityRef: "OBS targetReached=true after T0",
        note: "Observation records target reached after decision.",
      },
    ]);
  }

  // OHLCV assist (same plan only) when OBS insufficient
  if (!hasPath && attached) {
    if (zoneYes && stopYes && (verdict === "wait" || verdict === "no")) {
      return lane("mixed", [
        {
          t0Ref: zone
            ? `wait/no vs zone ${zone.low}-${zone.high}; stop ${c.t0Evidence.plan?.stopPrice}`
            : `verdict=${verdict}; stop@T0`,
          realityRef: `OHLCV plan=${attached.planId} zone=YES stop=YES`,
          note: "Zone and stop both reached on Case-bound OHLCV — mixed path.",
        },
      ]);
    }

    if (
      (verdict === "wait" || verdict === "no") &&
      zone &&
      zoneYes
    ) {
      return lane("condition_met", [
        {
          t0Ref: `participation/wait zone @ T0 ${zone.low}-${zone.high}`,
          realityRef: `OHLCV thesisZoneReached=YES (plan ${attached.planId})`,
          note: "Case-bound OHLCV shows primary zone reached after T0.",
        },
      ]);
    }

    if ((verdict === "wait" || verdict === "no") && zone && zoneNo) {
      return lane("condition_not_met", [
        {
          t0Ref: `wait zone @ T0 ${zone.low}-${zone.high}`,
          realityRef: `OHLCV thesisZoneReached=NO (plan ${attached.planId})`,
          note: "Case-bound OHLCV shows wait zone was not reached.",
        },
      ]);
    }

    if (verdict === "go" && t0Target != null && targetYes) {
      return lane("condition_met", [
        {
          t0Ref: `target@T0: ${t0Target}`,
          realityRef: `OHLCV targetReached=YES (plan ${attached.planId})`,
          note: "Case-bound OHLCV shows target level reached.",
        },
      ]);
    }

    if (verdict === "go" && t0Target != null && targetNo && stopYes) {
      return lane("condition_not_met", [
        {
          t0Ref: `target@T0: ${t0Target}; stop@T0: ${c.t0Evidence.plan?.stopPrice}`,
          realityRef: `OHLCV target=NO stop=YES (plan ${attached.planId})`,
          note: "Stop path without target on Case-bound OHLCV.",
        },
      ]);
    }

    return lane("INDETERMINATE", [
      {
        t0Ref: [
          verdict ? `verdict=${verdict}` : null,
          zone ? `zone ${zone.low}-${zone.high}` : null,
          t0Inv ? `invalidation: ${t0Inv}` : null,
        ]
          .filter(Boolean)
          .join(" | ") || "T0 present",
        realityRef: `OHLCV attached plan=${attached.planId} zone=${attached.thesisZoneReached} target=${attached.targetReached} stop=${attached.stopLevelReached}`,
        note: "OHLCV present but not enough to map cleanly onto frozen T0 conditions (e.g. monthly-close invalidation).",
      },
    ]);
  }

  if (!hasPath) {
    return lane("INDETERMINATE", [
      {
        t0Ref: t0Inv ?? zone
          ? `zone ${zone!.low}-${zone!.high}`
          : "T0 conditions present or thin",
        realityRef: "No Observation path; no Case-bound OHLCV summary for this plan",
        note: "Insufficient Reality to relate to T0 conditions.",
      },
    ]);
  }

  if (mr.horizonExpired) {
    return lane("condition_not_met", [
      {
        t0Ref: t0Target != null ? `target@T0 ${t0Target}` : "horizon conditions @ T0",
        realityRef: "evaluation horizon expired without OBS target/invalidation",
        note: "Horizon ended without clear condition satisfaction in Observations.",
      },
    ]);
  }

  return lane("INDETERMINATE", [
    {
      t0Ref: "T0 freeze available",
      realityRef: `OBS count=${obs.length} completeness=${mr.completeness}`,
      note: "Reality present but insufficient for a responsible relationship label.",
    },
  ]);
}

function buildOutcomeFacts(c: ThesisCase): string[] {
  const facts: string[] = [];
  const ex = c.postDecision.execution;
  if (ex.kind === "no_trade") {
    facts.push(`execution: no_trade (${ex.disposition ?? "—"})`);
  } else {
    facts.push(
      `execution: trade ${ex.tradeId} status=${ex.status} entry=${ex.entry ?? "—"} exit=${ex.exit ?? "—"}`
    );
    if (ex.riskRewardActual != null) {
      facts.push(`realized R hint: ${ex.riskRewardActual}`);
    }
    if (ex.realizedPnLHint != null) {
      facts.push(`PnL hint: ${ex.realizedPnLHint}`);
    }
  }
  const po = c.postDecision.outcome.planOutcome;
  if (po) {
    facts.push(`planOutcome: ${JSON.stringify(po)}`);
  }
  const lo = c.postDecision.learningEvidence.learningOutcome;
  if (lo) {
    facts.push(`learningOutcome: ${lo.id} kind=${lo.kind}`);
  }
  if (facts.length === 0) {
    facts.push("No canonical outcome facts recorded.");
  }
  return facts;
}

export function evaluateCase(input: {
  thesisCase: ThesisCase;
  ohlcv?: CaseOhlcvEvidence | null;
}): CaseEvaluation {
  const c = input.thesisCase;
  const decisionQuality = evaluateDecisionQuality(c);
  const executionQuality = evaluateExecutionQuality(c);
  const realityRelationship = evaluateRealityRelationship(c, input.ohlcv);
  const outcome = { facts: buildOutcomeFacts(c) };

  const uncertainty: string[] = [];
  if (decisionQuality.value === "INDETERMINATE") {
    uncertainty.push("Decision Quality indeterminate — missing or unusable T0.");
  }
  if (executionQuality.value === "INDETERMINATE") {
    uncertainty.push("Execution Quality indeterminate.");
  }
  if (realityRelationship.value === "INDETERMINATE") {
    uncertainty.push("Reality Relationship indeterminate.");
  }
  if (!c.t0Evidence.available) {
    uncertainty.push(
      "Historical Case without T0 freeze — no hindsight reconstruction from live Stock File."
    );
  }

  return {
    decisionQuality,
    executionQuality,
    realityRelationship,
    outcome,
    uncertainty,
  };
}

/** Build OHLCV evidence attach from Case page Market Reality VM (same plan only). */
export function ohlcvEvidenceFromMarketReality(input: {
  planId: string;
  retrospective: {
    available: boolean;
    window: { planId: string } | null;
    summary: {
      thesisZoneReached: "YES" | "NO" | "UNKNOWN";
      stopLevelReached: "YES" | "NO" | "UNKNOWN";
      targetReached: "YES" | "NO" | "UNKNOWN";
      entryLevelReached: "YES" | "NO" | "UNKNOWN";
      windowHigh: number | null;
      windowLow: number | null;
    } | null;
  } | null;
}): CaseOhlcvEvidence | null {
  const r = input.retrospective;
  if (!r?.available || !r.window || !r.summary) return null;
  if (r.window.planId.toUpperCase() !== input.planId.toUpperCase()) return null;
  return {
    planId: input.planId,
    available: true,
    thesisZoneReached: r.summary.thesisZoneReached,
    stopLevelReached: r.summary.stopLevelReached,
    targetReached: r.summary.targetReached,
    entryLevelReached: r.summary.entryLevelReached,
    windowHigh: r.summary.windowHigh,
    windowLow: r.summary.windowLow,
  };
}
