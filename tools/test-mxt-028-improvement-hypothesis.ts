/**
 * MXT 028 — Improvement Hypothesis learning loop (local).
 * Run: npx tsx tools/test-mxt-028-improvement-hypothesis.ts
 */
import assert from "node:assert/strict";
import {
  authorizeImprovementHypothesisForTesting,
  authorizeImprovementMethodChange,
  createImprovementHypothesisFromAcceptedMaf,
  defaultCandidateForComponent,
  linkPlanToImprovementHypothesis,
  setImprovementHypothesisEvidenceVerdict,
} from "../lib/improvement-hypothesis-apply";
import { summarizeImprovementEvidence } from "../lib/improvement-hypothesis-evidence";
import {
  getImprovementHypotheses,
  nextImprovementHypothesisId,
} from "../lib/improvement-hypothesis-store";
import {
  __setImprovementHypothesesStoreForTests,
  createMemoryImprovementHypothesesStore,
} from "../lib/improvement-hypotheses-store";
import { __setMafExperimentsStoreForTests } from "../lib/maf-experiments-store";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import type { MafExperiment } from "../lib/maf-types";
import type { InsightsCaseRow } from "../lib/insights-case-spine-types";
import type { TradePlan } from "../lib/plan-types";

function samplePlan(id: string, ticker = "TSLA"): TradePlan {
  return {
    id,
    ticker,
    status: "watching",
    analysisTimeframes: ["1H", "5m"],
    entryTimeframe: "5m",
    plannedEntry: 100,
    stopPrice: 95,
    targetPrice: 110,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function sampleMaf(overrides: Partial<MafExperiment> = {}): MafExperiment {
  return {
    id: "MAF-TSLA-001",
    planId: "PLAN-009",
    ticker: "TSLA",
    status: "concluded",
    humanApproved: true,
    evidence: { fillStatus: "missed", sources: { plan: true } },
    attributions: [
      {
        component: "entry_quality",
        classification: "failure",
        aiInterpretationConfidence: 80,
        reasoning: "chased / no layered structure",
        suggestedImprovement: "Use Optimized Layered Entry",
      },
    ],
    primaryDragComponent: "entry_quality",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    source: "attribution",
    ...overrides,
  };
}

async function main() {
  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  process.env.IMPROVEMENT_HYPOTHESES_STORE = "memory";
  process.env.MAF_EXPERIMENTS_STORE = "memory";

  try {
    await runTests();
  } finally {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    __setImprovementHypothesesStoreForTests(null, null);
    __setMafExperimentsStoreForTests(null, null);
    __setPlansStoreForTests(null);
  }
}

async function runTests() {
  // 1) OLE default candidate
  {
    const d = defaultCandidateForComponent("entry_quality", null);
    assert.equal(d.label, "Optimized Layered Entry");
    assert.equal(d.kind, "technique");
  }

  // 2) ID allocator
  {
    assert.equal(nextImprovementHypothesisId([], "tsla"), "IH-TSLA-001");
    assert.equal(
      nextImprovementHypothesisId([{ id: "IH-TSLA-001" } as never], "TSLA"),
      "IH-TSLA-002"
    );
  }

  // 3) Evidence summary excludes origin; never auto-claims Supported
  {
    const spine = [
      { planId: "PLAN-009", family: "B", decisionQuality: "supported" },
      { planId: "PLAN-010", family: "A", decisionQuality: "supported" },
      { planId: "PLAN-011", family: "A", decisionQuality: "weakly_supported" },
      { planId: "PLAN-012", family: "C", decisionQuality: "not_supported" },
    ] as InsightsCaseRow[];

    const low = summarizeImprovementEvidence({
      hypothesisId: "IH-TSLA-001",
      originPlanId: "PLAN-009",
      evidencePlanIds: ["PLAN-009", "PLAN-010"],
      caseSpine: spine,
    });
    assert.equal(low.independentEvidenceCount, 1);
    assert.equal(low.suggestedIndication, "insufficient_evidence");
    assert.ok(!low.evidencePlanIds.includes("PLAN-009"));

    const ready = summarizeImprovementEvidence({
      hypothesisId: "IH-TSLA-001",
      originPlanId: "PLAN-009",
      evidencePlanIds: ["PLAN-010", "PLAN-011", "PLAN-012"],
      caseSpine: spine,
    });
    assert.equal(ready.independentEvidenceCount, 3);
    assert.equal(ready.suggestedIndication, "review_ready");
  }

  // 4) Create from accepted MAF → authorize → refuse origin → link future → verdict → method auth
  {
    __setImprovementHypothesesStoreForTests([], "memory");
    __setMafExperimentsStoreForTests([sampleMaf()], "memory");
    __setPlansStoreForTests(
      createMemoryPlansStore([
        samplePlan("PLAN-009"),
        samplePlan("PLAN-010"),
      ])
    );

    const created = await createImprovementHypothesisFromAcceptedMaf({
      originPlanId: "PLAN-009",
    });
    assert.ok(created.hypothesis);
    assert.equal(created.hypothesis?.status, "proposed");
    assert.equal(created.hypothesis?.candidateLabel, "Optimized Layered Entry");
    assert.equal(created.hypothesis?.componentId, "entry_quality");
    assert.equal(created.hypothesis?.originMafExperimentId, "MAF-TSLA-001");
    assert.deepEqual(created.hypothesis?.evidencePlanIds, []);

    const dup = await createImprovementHypothesisFromAcceptedMaf({
      originPlanId: "PLAN-009",
    });
    assert.ok(dup.errors?.length);

    const auth = await authorizeImprovementHypothesisForTesting(
      created.hypothesis!.id
    );
    assert.equal(auth.hypothesis?.status, "testing");

    const originBlocked = await linkPlanToImprovementHypothesis({
      hypothesisId: created.hypothesis!.id,
      planId: "PLAN-009",
    });
    assert.ok(originBlocked.errors?.some((e) => /originating Case/i.test(e)));

    const linked = await linkPlanToImprovementHypothesis({
      hypothesisId: created.hypothesis!.id,
      planId: "PLAN-010",
    });
    assert.ok(linked.hypothesis?.evidencePlanIds.includes("PLAN-010"));
    assert.equal(linked.plan?.improvementHypothesisId, created.hypothesis!.id);

    const earlyMethod = await authorizeImprovementMethodChange({
      hypothesisId: created.hypothesis!.id,
    });
    assert.ok(earlyMethod.errors?.length);

    const insuff = await setImprovementHypothesisEvidenceVerdict({
      hypothesisId: created.hypothesis!.id,
      status: "insufficient_evidence",
      note: "only 1 independent Case",
    });
    assert.equal(insuff.hypothesis?.status, "insufficient_evidence");

    await setImprovementHypothesisEvidenceVerdict({
      hypothesisId: created.hypothesis!.id,
      status: "supported",
      note: "human judgment after review — not auto",
    });
    const method = await authorizeImprovementMethodChange({
      hypothesisId: created.hypothesis!.id,
      note: "record authorization only",
    });
    assert.equal(method.hypothesis?.status, "method_change_authorized");
    assert.ok(method.hypothesis?.methodChangeAuthorizedAt);

    const all = await getImprovementHypotheses();
    assert.equal(all.length, 1);
  }

  // 5) Unaccepted MAF blocked
  {
    __setImprovementHypothesesStoreForTests(
      createMemoryImprovementHypothesesStore([]),
      "memory"
    );
    __setMafExperimentsStoreForTests(
      [
        sampleMaf({
          status: "collecting",
          humanApproved: false,
          attributions: [],
          primaryDragComponent: undefined,
        }),
      ],
      "memory"
    );
    __setPlansStoreForTests(createMemoryPlansStore([samplePlan("PLAN-009")]));
    const blocked = await createImprovementHypothesisFromAcceptedMaf({
      originPlanId: "PLAN-009",
    });
    assert.ok(blocked.errors?.some((e) => /not accepted/i.test(e)));
  }

  // Read-only gate: must return errors, never throw uncaught.
  {
    __setImprovementHypothesesStoreForTests(
      createMemoryImprovementHypothesesStore([]),
      "memory"
    );
    __setMafExperimentsStoreForTests([sampleMaf()], "memory");
    __setPlansStoreForTests(createMemoryPlansStore([samplePlan("PLAN-009")]));

    const prevRo = process.env.MXT_READ_ONLY;
    process.env.MXT_READ_ONLY = "1";
    const { assertMxtPersistenceWriteAllowed } = await import(
      "../lib/mxt-readonly"
    );
    // Force the store path used in memory still calls upsert — wrap by stubbing upsert via
    // temporarily using a store that throws like production read-only.
    const { createMemoryImprovementHypothesesStore: mem } = await import(
      "../lib/improvement-hypotheses-store"
    );
    const base = mem([]);
    __setImprovementHypothesesStoreForTests(
      {
        ...base,
        async upsert(row) {
          assertMxtPersistenceWriteAllowed("improvement_hypotheses.storage.upsert");
          return base.upsert(row);
        },
      },
      "memory"
    );

    const ro = await createImprovementHypothesisFromAcceptedMaf({
      originPlanId: "PLAN-009",
    });
    assert.ok(ro.errors?.some((e) => /MXT_READ_ONLY/i.test(e)), ro.errors?.join("; "));
    assert.equal(ro.hypothesis, undefined);

    if (prevRo === undefined) delete process.env.MXT_READ_ONLY;
    else process.env.MXT_READ_ONLY = prevRo;
  }

  __setImprovementHypothesesStoreForTests(null, null);
  __setMafExperimentsStoreForTests(null, null);
  __setPlansStoreForTests(null);

  console.log("MXT 028 improvement hypothesis tests: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
