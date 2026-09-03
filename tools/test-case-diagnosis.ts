/**
 * MXT 016a — Case diagnosis equations.
 * Fixtures only. Run: npx tsx tools/test-case-diagnosis.ts
 */
import assert from "node:assert/strict";
import type { CaseEvaluation } from "../lib/case-evaluation-types";
import type { ThesisCase } from "../lib/thesis-case-types";
import type { ThesisT0Freeze } from "../lib/thesis-t0-types";
import {
  aggregateDiagnoses,
  diagnoseCase,
  EQ,
  evaluateFalseVirtuousLoop,
  outcomePolarityFromFacts,
} from "../lib/case-diagnosis";

function freezeFor(
  verdict: "go" | "wait" | "no" | "probe"
): ThesisT0Freeze {
  return {
    id: "T0-1",
    stockThesisId: "ST-DX-001",
    t0: "2026-01-01T00:00:00.000Z",
    evaluationHorizonEndsAt: "2026-04-01T00:00:00.000Z",
    evaluationHorizonDays: 90,
    evaluationHorizonOverride: false,
    beliefFingerprint: "abc",
    planIds: ["PLAN-DX-001"],
    stock: {
      stockThesisId: "ST-DX-001",
      stockThesisVersion: 1,
      thesis: "t",
      currentHypothesis: "h",
      levels: { primaryZone: { low: 100, high: 105 } },
      riskRules: { minimumRR: 2, invalidation: "Close below 98" },
    },
    decision: {
      decisionId: "D1",
      decidedAt: "2026-01-01T00:00:00.000Z",
      verdict,
      reasoning: "criteria present",
      challenges: ["c1"],
      decidedBy: "human",
      locationEvidence: "zone",
    },
    plan: {
      planId: "PLAN-DX-001",
      plannedEntry: 102,
      stopPrice: 98,
      targetPrice: 110,
      plannedRR: 2,
      layeredEntry: null,
      executionInstruction: null,
      validFrom: null,
      maximumEntryProxy: 102,
    },
    confidence: "verified",
    status: "open",
    t1: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function baseCase(overrides: {
  planId?: string;
  verdict?: "go" | "wait" | "no" | "probe";
  t0Available?: boolean;
  execution?: ThesisCase["postDecision"]["execution"];
}): ThesisCase {
  const verdict = overrides.verdict ?? "wait";
  const t0Available = overrides.t0Available ?? true;
  const planId = overrides.planId ?? "PLAN-DX-001";
  const freeze = t0Available ? freezeFor(verdict) : null;
  if (freeze) freeze.plan.planId = planId;

  return {
    identity: {
      anchorPlanId: planId,
      stockThesisId: "ST-DX-001",
      ticker: "TEST",
      relatedPlanIds: [planId],
      t0: freeze?.t0 ?? null,
      t1: null,
      evaluationHorizonDays: freeze?.evaluationHorizonDays ?? null,
      evaluationHorizonEndsAt: freeze?.evaluationHorizonEndsAt ?? null,
      episodeStatus: freeze?.status ?? "no_freeze",
      confidence: freeze?.confidence ?? "unavailable",
    },
    temporalIntegrity: {
      t0Source: freeze ? "scout_decision" : "none",
      t0: freeze?.t0 ?? null,
      freezeId: freeze?.id ?? null,
      freezeAvailable: Boolean(freeze),
      confidence: freeze?.confidence ?? "unavailable",
      t0VerifiedForReconstruction: Boolean(freeze),
    },
    freeze,
    t0Evidence: {
      available: t0Available,
      integrity: t0Available ? "verified" : "unavailable",
      decision: t0Available
        ? {
            decisionId: "D1",
            decidedAt: "2026-01-01T00:00:00.000Z",
            verdict,
            reasoning: "criteria present",
            challenges: ["c1"],
            decidedBy: "human",
          }
        : null,
      preEvent: t0Available
        ? {
            thesis: "t",
            currentHypothesis: "h",
            levels: { primaryZone: { low: 100, high: 105 } },
            riskRules: { minimumRR: 2, invalidation: "Close below 98" },
            stockThesisVersion: 1,
          }
        : null,
      plan: t0Available
        ? {
            planId,
            plannedEntry: 102,
            stopPrice: 98,
            targetPrice: 110,
            plannedRR: 2,
            layeredEntry: null,
            executionInstruction: null,
            maximumEntryProxy: 102,
          }
        : null,
    },
    postDecision: {
      execution: overrides.execution ?? {
        kind: "no_trade",
        disposition: "wait",
        scoutVerdict: verdict,
        planStatus: "watching",
      },
      marketReality: {
        observations: [],
        completeness: "unavailable",
        horizonExpired: false,
      },
      outcome: { planOutcome: null, tradeReviewedAt: null, tradeLesson: null },
      learningEvidence: {
        learningOutcome: null,
        observations: [],
        mafExperiment: null,
        laterDecisions: [],
      },
    },
  };
}

function evalLane(
  rr: CaseEvaluation["realityRelationship"]["value"],
  dq: CaseEvaluation["decisionQuality"]["value"] = "supported",
  eq: CaseEvaluation["executionQuality"]["value"] = "not_applicable",
  facts: string[] = ["execution: no_trade (wait)"]
): CaseEvaluation {
  return {
    decisionQuality: {
      value: dq,
      evidence: [{ t0Ref: "t0", realityRef: "r", note: "dq" }],
    },
    executionQuality: {
      value: eq,
      evidence: [{ t0Ref: "t0", realityRef: "r", note: "eq" }],
    },
    realityRelationship: {
      value: rr,
      evidence: [
        {
          t0Ref: "zone@T0",
          realityRef: `rr=${rr}`,
          note: "fixture",
        },
      ],
    },
    outcome: { facts },
    uncertainty: [],
  };
}

function run() {
  // 1. Good Filter
  {
    const d = diagnoseCase({
      thesisCase: baseCase({ verdict: "wait" }),
      evaluation: evalLane("condition_not_met"),
    });
    assert.equal(d.classification.kind, "no_entry");
    assert.equal(
      d.classification.kind === "no_entry" && d.classification.value,
      "GOOD_FILTER"
    );
    assert.equal(d.equationId, EQ.NE_GOOD_FILTER);
  }

  // 2. Over-optimization (Reality condition_met — not outcome)
  {
    const d = diagnoseCase({
      thesisCase: baseCase({ verdict: "no" }),
      evaluation: evalLane("condition_met", "supported", "not_applicable", [
        "PnL hint: 999",
        "market rose",
      ]),
    });
    assert.equal(
      d.classification.kind === "no_entry" && d.classification.value,
      "OVER_OPTIMIZATION"
    );
    assert.equal(d.equationId, EQ.NE_OVER_OPT);
  }

  // 3. Indeterminate no-entry
  {
    const d = diagnoseCase({
      thesisCase: baseCase({ verdict: "wait" }),
      evaluation: evalLane("INDETERMINATE"),
    });
    assert.equal(
      d.classification.kind === "no_entry" && d.classification.value,
      "INDETERMINATE"
    );
  }

  // 4. Entry families A / C / D
  {
    const a = diagnoseCase({
      thesisCase: baseCase({
        verdict: "go",
        execution: {
          kind: "trade",
          tradeId: "T1",
          status: "closed",
          entry: 101,
          exit: 110,
          stop: 98,
          target: 110,
          closedAt: "2026-02-01T00:00:00.000Z",
          exitReason: "target",
          riskRewardActual: 2,
          realizedPnLHint: 80,
        },
      }),
      evaluation: evalLane("condition_met", "supported", "respected", [
        "execution: trade T1",
        "PnL hint: 80",
      ]),
    });
    assert.equal(a.classification.kind === "entry_family" && a.classification.value, "A");

    const c = diagnoseCase({
      thesisCase: baseCase({
        verdict: "go",
        execution: {
          kind: "trade",
          tradeId: "T2",
          status: "closed",
          entry: 101,
          exit: 98,
          stop: 98,
          target: 110,
          closedAt: "2026-02-01T00:00:00.000Z",
          exitReason: "stop",
          riskRewardActual: -1,
          realizedPnLHint: -40,
        },
      }),
      evaluation: evalLane("condition_not_met", "supported", "respected", [
        "execution: trade T2",
        "PnL hint: -40",
        "stop",
      ]),
    });
    assert.equal(c.classification.kind === "entry_family" && c.classification.value, "C");

    const dFam = diagnoseCase({
      thesisCase: baseCase({ verdict: "go" }),
      evaluation: evalLane("condition_met", "not_supported", "violated", [
        "execution: trade T3",
      ]),
    });
    assert.equal(
      dFam.classification.kind === "entry_family" && dFam.classification.value,
      "D"
    );
  }

  // 5. Missing T0
  {
    const d = diagnoseCase({
      thesisCase: baseCase({ verdict: "wait", t0Available: false }),
      evaluation: evalLane("condition_met"),
    });
    assert.equal(d.equationId, EQ.NE_MISSING_T0);
    assert.equal(
      d.classification.kind === "no_entry" && d.classification.value,
      "INDETERMINATE"
    );
    assert.ok(d.missingInputs.includes("t0_freeze"));
  }

  // 6. Outcome isolation — favorable outcome alone cannot → OVER_OPTIMIZATION
  {
    const d = diagnoseCase({
      thesisCase: baseCase({ verdict: "wait" }),
      evaluation: evalLane("condition_not_met", "supported", "not_applicable", [
        "PnL hint: 500",
        "price +8%",
      ]),
    });
    assert.equal(
      d.classification.kind === "no_entry" && d.classification.value,
      "GOOD_FILTER"
    );
    assert.notEqual(d.equationId, EQ.NE_OVER_OPT);

    const stillIndet = diagnoseCase({
      thesisCase: baseCase({ verdict: "wait" }),
      evaluation: evalLane("INDETERMINATE", "supported", "not_applicable", [
        "PnL hint: 500",
      ]),
    });
    assert.equal(
      stillIndet.classification.kind === "no_entry" &&
        stillIndet.classification.value,
      "INDETERMINATE"
    );
  }

  // 7. Aggregate denominators / rates
  {
    const diagnoses = [
      diagnoseCase({
        thesisCase: baseCase({ planId: "P1", verdict: "wait" }),
        evaluation: evalLane("condition_not_met"),
      }),
      diagnoseCase({
        thesisCase: baseCase({ planId: "P2", verdict: "wait" }),
        evaluation: evalLane("condition_met"),
      }),
      diagnoseCase({
        thesisCase: baseCase({ planId: "P3", verdict: "wait" }),
        evaluation: evalLane("INDETERMINATE"),
      }),
    ];

    const agg = aggregateDiagnoses({
      diagnoses,
      totalCases: 3,
      entryCases: 0,
      noEntryCases: 3,
      missingT0Cases: 0,
    });
    assert.equal(agg.goodFilter, 1);
    assert.equal(agg.overOptimization, 1);
    assert.equal(agg.indeterminateNoEntry, 1);
    assert.equal(agg.rates.goodFilterRate, 1 / 3);
    assert.equal(agg.rates.overOptimizationRate, 1 / 3);
  }

  // 8. False-loop does not trigger from high no-entry alone
  {
    const alone = evaluateFalseVirtuousLoop({
      totalCases: 20,
      entryCases: 1,
      noEntryCases: 19,
      goodFilter: 18,
      overOptimization: 0,
      indeterminateNoEntry: 1,
    });
    assert.equal(alone.suspected, false);

    const suspected = evaluateFalseVirtuousLoop({
      totalCases: 20,
      entryCases: 1,
      noEntryCases: 19,
      goodFilter: 2,
      overOptimization: 10,
      indeterminateNoEntry: 7,
    });
    assert.equal(suspected.suspected, true);
  }

  assert.equal(outcomePolarityFromFacts(["PnL hint: 12"]), "favorable");
  assert.equal(outcomePolarityFromFacts(["PnL hint: -3"]), "adverse");

  console.log("test-case-diagnosis: PASS");
}

run();
