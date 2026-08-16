/**
 * AUDIT FINDING 001 — Canonical Apply → Verify pipeline.
 * Run: npm run test:apply-pipeline
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runCanonicalApplyPipeline } from "../lib/apply-pipeline";
import { verifyApplyPersistence } from "../lib/apply-verify";
import type { TradingInboxPayload } from "../lib/bridge";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import type { TradePlan } from "../lib/plan-types";

const root = join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-APPLY-001",
    ticker: "MSFT",
    stockThesisId: "ST-MSFT-APPLY",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 100,
    stopPrice: 90,
    targetPrice: 140,
    plannedRR: 4,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    decision: {
      id: "DEC-APPLY-1",
      verdict: "wait",
      decisionConfidence: 70,
      challenges: ["timing"],
      decidedAt: "2026-07-01T00:00:00.000Z",
    },
    ...overrides,
  };
}

{
  // Shared helper exists; both entry points use it; no duplicate verify-only Control path.
  const actions = read("app/actions.ts");
  const pipeline = read("lib/apply-pipeline.ts");
  assert.match(pipeline, /export async function runCanonicalApplyPipeline/);
  assert.match(pipeline, /verifyApplyPersistence/);
  assert.match(pipeline, /applyTradingProposal/);
  assert.match(actions, /runCanonicalApplyPipeline/);
  assert.match(actions, /acceptAiBlockAction/);
  assert.match(actions, /applyInboxItemAction/);
  // Control Accept must not call applyTradingProposal directly anymore.
  assert.equal(
    (actions.match(/applyTradingProposal\(/g) ?? []).length,
    0
  );
  // Both Control and Inbox go through the shared pipeline.
  const acceptIdx = actions.indexOf("export async function acceptAiBlockAction");
  const inboxIdx = actions.indexOf("export async function applyInboxItemAction");
  assert.ok(acceptIdx >= 0 && inboxIdx >= 0);
  assert.match(
    actions.slice(acceptIdx, inboxIdx),
    /runCanonicalApplyPipeline\(parsed\.body\)/
  );
  assert.match(
    actions.slice(inboxIdx),
    /runCanonicalApplyPipeline\(payload\)/
  );
  // Verify failure is not treated as success on Control.
  assert.match(actions.slice(acceptIdx, inboxIdx), /stage: pipeline\.stage/);
  assert.match(actions.slice(acceptIdx, inboxIdx), /verifyDetail/);
  // Inbox acks only after verified success (verified hard-coded "1").
  assert.match(actions.slice(inboxIdx), /verified: "1"/);
  assert.match(
    actions.slice(inboxIdx),
    /Canonical lifecycle: Apply → Verify/
  );
}

{
  // Capital / EP types are covered by verify (no longer unsupported default).
  const verifySrc = read("lib/apply-verify.ts");
  assert.match(verifySrc, /capital-configuration-create/);
  assert.match(verifySrc, /capital-reservation-create/);
  assert.match(verifySrc, /external-position-create/);
  assert.match(verifySrc, /verifyCapitalConfigurationPersistence/);
  assert.match(verifySrc, /verifyExternalPositionPersistence/);
}

async function main() {
  // Pipeline: apply + verify success for decision-update OA / readiness.
  __setPlansStoreForTests(createMemoryPlansStore([basePlan()]));
  const payload = {
    type: "decision-update",
    source: "test",
    proposal: {
      planId: "PLAN-APPLY-001",
      executionReadiness: "armed",
    },
  };
  const result = await runCanonicalApplyPipeline(payload);
  assert.equal(result.ok, true, result.ok ? "" : result.error);
  if (result.ok) {
    assert.equal(result.apply.ok, true);
    assert.equal(result.verify.ok, true);
    assert.match(result.verify.detail, /executionReadiness|Tactical|PLAN-APPLY-001/i);
  }

  // Pipeline: verify failure surfaces as structured error (not success).
  __setPlansStoreForTests(createMemoryPlansStore([]));
  const missing = await runCanonicalApplyPipeline({
    type: "decision-update",
    source: "test",
    proposal: {
      planId: "PLAN-MISSING",
      executionReadiness: "armed",
    },
  });
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.ok(missing.stage === "apply" || missing.stage === "verify");
    assert.match(missing.error, /not found|Plan|failed|Verification/i);
  }

  // Unsupported-shape parse failure.
  const bad = await runCanonicalApplyPipeline({ foo: "bar" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.stage, "parse");

  // Direct verify coverage for capital configuration type (no longer unsupported).
  const capitalCheck = await verifyApplyPersistence({
    type: "capital-configuration-create",
    source: "test",
    proposal: { settledCashBase: 10000, settledCashAsOf: "2026-07-01T00:00:00.000Z" },
  } as TradingInboxPayload);
  // May fail if no active config in empty store — but must not be "Unsupported proposal type".
  assert.doesNotMatch(capitalCheck.detail, /Unsupported proposal type/);

  __setPlansStoreForTests(null);
  console.log("test-apply-pipeline-001: ok");
}

main().catch((err) => {
  __setPlansStoreForTests(null);
  console.error(err);
  process.exit(1);
});
