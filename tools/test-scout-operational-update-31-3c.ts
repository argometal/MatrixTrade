/**
 * 31-3C — Update operational state: proposal → validate → Accept → filters.
 * Run: npm run test:scout-operational-update
 */
import assert from "node:assert/strict";
import { parseAiBlock } from "../lib/ai-block";
import { verifyApplyPersistence } from "../lib/apply-verify";
import {
  validateProposalPayload,
  type TradingInboxPayload,
} from "../lib/bridge";
import { getPlanById } from "../lib/plans";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import {
  buildScoutMonitoringSections,
  resolveScoutMonitoringBucket,
} from "../lib/scout-monitoring";
import {
  SCOUT_OPERATIONAL_STATUS_ACTIONS,
  addCalendarDaysIso,
  buildOperationalStatusPreview,
  evaluateScoutOperationalState,
  parseOperationalPhraseToProposal,
} from "../lib/scout-operational-state";
import { applyDecisionUpdateFromProposal } from "../lib/scout-plan-repair";
import type { TradePlan } from "../lib/plan-types";

const NOW = "2026-07-30T12:00:00.000Z";

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-31-3C",
    ticker: "MSFT",
    stockThesisId: "ST-MSFT-31C",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 140,
    plannedRR: 4,
    validUntil: "2026-09-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-25T00:00:00.000Z",
    decision: {
      id: "DEC-31-3C",
      verdict: "wait",
      decisionConfidence: 70,
      challenges: ["timing"],
      decidedAt: "2026-07-25T00:00:00.000Z",
    },
    ...overrides,
  };
}

function reset(seed: TradePlan[] = [basePlan()]) {
  __setPlansStoreForTests(createMemoryPlansStore(seed));
}

function cleanup() {
  __setPlansStoreForTests(null);
}

function proposalFromJson(json: string): Record<string, unknown> {
  const body = JSON.parse(json) as { proposal: Record<string, unknown> };
  return body.proposal;
}

async function main() {
  // 1 — all six options generate a proposal + preview
  {
    for (const action of SCOUT_OPERATIONAL_STATUS_ACTIONS) {
      const parsed = parseOperationalPhraseToProposal(basePlan(), action, NOW);
      assert.equal(parsed.ok, true, `generate ${action}`);
      if (!parsed.ok) continue;
      assert.equal(parsed.action, action);
      assert.match(parsed.json, /"type": "decision-update"/);
      assert.match(parsed.json, /"planId": "PLAN-31-3C"/);

      const preview = buildOperationalStatusPreview(basePlan(), action, NOW);
      assert.equal(preview.ok, true, `preview ${action}`);
      if (!preview.ok) continue;
      assert.equal(preview.preview.action, action);
      assert.ok(preview.preview.json.includes("decision-update"));
      assert.ok(Array.isArray(preview.preview.changes));
      assert.ok(Array.isArray(preview.preview.affectedFields));
    }
  }

  // 2 — generated JSON passes current validator for all six
  {
    for (const action of SCOUT_OPERATIONAL_STATUS_ACTIONS) {
      const parsed = parseOperationalPhraseToProposal(basePlan(), action, NOW);
      assert.equal(parsed.ok, true);
      if (!parsed.ok) continue;
      const block = parseAiBlock(parsed.json);
      assert.equal(block.ok, true, `parseAiBlock ${action}: ${!block.ok ? block.error : ""}`);
      if (!block.ok) continue;
      const check = validateProposalPayload(block.payload);
      assert.equal(
        check.ok,
        true,
        `validate ${action}: ${check.ok ? "" : check.errors.join("; ")}`
      );
    }
  }

  // 3 — Review 1D / 1W calculate correct calendar dates
  {
    assert.equal(addCalendarDaysIso(NOW, 1), "2026-07-31T12:00:00.000Z");
    assert.equal(addCalendarDaysIso(NOW, 7), "2026-08-06T12:00:00.000Z");

    const d1 = parseOperationalPhraseToProposal(basePlan(), "Review 1D", NOW);
    assert.equal(d1.ok, true);
    if (d1.ok) {
      const p = proposalFromJson(d1.json);
      const oa = p.operationalAssessment as Record<string, unknown>;
      assert.equal(oa.reviewRequired, true);
      assert.equal(oa.nextReviewAt, "2026-07-31T12:00:00.000Z");
      assert.equal(oa.operationalState, "approaching");
      assert.equal(oa.waitHorizon, "days");
    }

    const w1 = parseOperationalPhraseToProposal(basePlan(), "Review 1W", NOW);
    assert.equal(w1.ok, true);
    if (w1.ok) {
      const p = proposalFromJson(w1.json);
      const oa = p.operationalAssessment as Record<string, unknown>;
      assert.equal(oa.reviewRequired, true);
      assert.equal(oa.nextReviewAt, "2026-08-06T12:00:00.000Z");
      assert.equal(oa.waitHorizon, "weeks");
    }
  }

  // 4 — Armed updates executionReadiness only (not OA verdict substitute)
  {
    const armed = parseOperationalPhraseToProposal(basePlan(), "Armed", NOW);
    assert.equal(armed.ok, true);
    if (armed.ok) {
      const p = proposalFromJson(armed.json);
      assert.equal(p.executionReadiness, "armed");
      assert.equal(p.operationalAssessment, undefined);
    }
  }

  // 5 — Unlikely does not invalidate / cancel / expire / pass
  {
    const unlikely = parseOperationalPhraseToProposal(basePlan(), "Unlikely", NOW);
    assert.equal(unlikely.ok, true);
    if (unlikely.ok) {
      const p = proposalFromJson(unlikely.json);
      const oa = p.operationalAssessment as Record<string, unknown>;
      assert.equal(oa.operationalState, "improbable");
      assert.notEqual(oa.operationalState, "missed");
      assert.notEqual(oa.operationalState, "expired");
      assert.notEqual(p.status, "cancelled");
      assert.notEqual(p.status, "expired");
    }
  }

  // 6 — Accept persists each mapping + Scout projection / filters refresh
  {
    const cases: Array<{
      action: (typeof SCOUT_OPERATIONAL_STATUS_ACTIONS)[number];
      assertPlan: (plan: TradePlan) => void;
      bucket: keyof ReturnType<typeof buildScoutMonitoringSections>;
    }> = [
      {
        action: "Passed",
        bucket: "passed",
        assertPlan: (plan) => {
          const oa = plan.decision?.operationalAssessment;
          assert.equal(oa?.operationalState, "missed");
          assert.equal(oa?.reviewRequired, false);
          assert.ok(oa?.reasonCodes.includes("entry_passed_without_execution"));
        },
      },
      {
        action: "Review 1D",
        bucket: "needsReview",
        assertPlan: (plan) => {
          const oa = plan.decision?.operationalAssessment;
          assert.equal(oa?.reviewRequired, true);
          assert.equal(oa?.nextReviewAt, "2026-07-31T12:00:00.000Z");
          assert.equal(oa?.operationalState, "approaching");
        },
      },
      {
        action: "Review 1W",
        bucket: "needsReview",
        assertPlan: (plan) => {
          const oa = plan.decision?.operationalAssessment;
          assert.equal(oa?.reviewRequired, true);
          assert.equal(oa?.nextReviewAt, "2026-08-06T12:00:00.000Z");
        },
      },
      {
        action: "Reanalyze",
        bucket: "needsReview",
        assertPlan: (plan) => {
          const oa = plan.decision?.operationalAssessment;
          assert.equal(oa?.operationalState, "needs_reanalysis");
          assert.equal(oa?.reviewRequired, true);
          assert.equal(oa?.nextReviewAt, NOW);
        },
      },
      {
        action: "Unlikely",
        bucket: "lowProbability",
        assertPlan: (plan) => {
          const oa = plan.decision?.operationalAssessment;
          assert.equal(oa?.operationalState, "improbable");
          assert.notEqual(plan.status, "cancelled");
          assert.notEqual(plan.status, "expired");
        },
      },
      {
        action: "Armed",
        bucket: "actionNow",
        assertPlan: (plan) => {
          assert.equal(plan.executionReadiness, "armed");
        },
      },
    ];

    for (const c of cases) {
      reset([basePlan()]);
      const generated = parseOperationalPhraseToProposal(basePlan(), c.action, NOW);
      assert.equal(generated.ok, true, `persist generate ${c.action}`);
      if (!generated.ok) continue;
      const proposal = proposalFromJson(generated.json);
      const applied = await applyDecisionUpdateFromProposal(proposal);
      assert.equal(
        applied.errors,
        undefined,
        `Accept ${c.action}: ${applied.errors?.join("; ")}`
      );
      assert.ok(applied.plan, `Accept ${c.action} returned plan`);
      c.assertPlan(applied.plan!);

      const reloaded = await getPlanById("PLAN-31-3C");
      assert.ok(reloaded, `reload ${c.action}`);
      c.assertPlan(reloaded!);

      const payload = {
        type: "decision-update",
        source: "operational-quick-update",
        proposal,
      } as TradingInboxPayload;
      const verify = await verifyApplyPersistence(payload);
      assert.equal(verify.ok, true, `verify ${c.action}: ${verify.detail}`);

      const sections = buildScoutMonitoringSections({
        plans: [reloaded!],
        trades: [],
        reservations: [],
        now: NOW,
      });
      assert.equal(
        sections[c.bucket].some((row) => row.planId === "PLAN-31-3C"),
        true,
        `${c.action} → filter ${c.bucket}`
      );

      // Incompatible active-review filters clear for Passed / Unlikely / Armed
      if (c.action === "Passed") {
        assert.equal(sections.needsReview.length, 0);
        assert.equal(sections.actionNow.length, 0);
        assert.equal(sections.lowProbability.length, 0);
      }
      if (c.action === "Unlikely") {
        assert.equal(sections.passed.length, 0);
        assert.equal(sections.needsReview.length, 0);
      }
    }
  }

  // 7 — generation failures are visible (never silent)
  {
    const bad = parseOperationalPhraseToProposal(basePlan(), "not-a-real-action", NOW);
    assert.equal(bad.ok, false);
    if (!bad.ok) {
      assert.match(bad.error, /Phrase not recognized/);
    }
    const empty = buildOperationalStatusPreview(basePlan(), "   ", NOW);
    assert.equal(empty.ok, false);
  }

  // 8 — mutation failure surfaces errors (invalid OA / readiness)
  {
    reset([basePlan()]);
    const badOa = await applyDecisionUpdateFromProposal({
      planId: "PLAN-31-3C",
      operationalAssessment: { foo: "bar" },
    });
    assert.ok(badOa.errors?.length, "invalid OA must error");
    assert.match(badOa.errors![0], /operationalAssessment/);

    const badReady = await applyDecisionUpdateFromProposal({
      planId: "PLAN-31-3C",
      executionReadiness: "not-a-state",
    });
    assert.ok(badReady.errors?.length, "invalid readiness must error");
    assert.match(badReady.errors![0], /executionReadiness/);

    const missing = await applyDecisionUpdateFromProposal({
      planId: "PLAN-MISSING",
      executionReadiness: "armed",
    });
    assert.ok(missing.errors?.length, "missing plan must error");
  }

  // 9 — filters derive from persisted fields (confirmed OA / readiness), not local UI state
  {
    const confirmedPassed = basePlan({
      decision: {
        id: "DEC-P",
        verdict: "wait",
        decisionConfidence: 60,
        challenges: ["timing"],
        decidedAt: NOW,
        operationalAssessment: {
          thesisState: "unknown",
          operationalState: "missed",
          waitHorizon: "unknown",
          nextAction: "replace_plan",
          freshness: "stale",
          reviewRequired: false,
          reasonCodes: ["entry_passed_without_execution"],
          source: "manual_override",
          confirmedAt: NOW,
        },
      },
    });
    const evalPassed = evaluateScoutOperationalState({
      plan: confirmedPassed,
      linkedTrades: [],
      reservations: [],
      now: NOW,
      minimumRR: 3,
    });
    assert.equal(
      resolveScoutMonitoringBucket(confirmedPassed, evalPassed),
      "passed"
    );

    const armedPlan = basePlan({ executionReadiness: "armed" });
    const evalArmed = evaluateScoutOperationalState({
      plan: armedPlan,
      linkedTrades: [],
      reservations: [],
      now: NOW,
      minimumRR: 3,
    });
    assert.equal(resolveScoutMonitoringBucket(armedPlan, evalArmed), "actionNow");

    const unlikelyPlan = basePlan({
      decision: {
        id: "DEC-U",
        verdict: "wait",
        decisionConfidence: 55,
        challenges: ["timing"],
        decidedAt: NOW,
        operationalAssessment: {
          thesisState: "unknown",
          operationalState: "improbable",
          waitHorizon: "improbable",
          nextAction: "monitor",
          freshness: "current",
          reviewRequired: false,
          reasonCodes: ["distance_improbable"],
          source: "manual_override",
          confirmedAt: NOW,
        },
      },
    });
    const evalU = evaluateScoutOperationalState({
      plan: unlikelyPlan,
      linkedTrades: [],
      reservations: [],
      now: NOW,
      minimumRR: 3,
    });
    assert.equal(
      resolveScoutMonitoringBucket(unlikelyPlan, evalU),
      "lowProbability"
    );
  }

  cleanup();
  console.log("test-scout-operational-update-31-3c: ok");
}

main().catch((err) => {
  cleanup();
  console.error(err);
  process.exit(1);
});
