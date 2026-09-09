/**
 * MXT 035 — identical geometry stall + override.
 * Run: npx tsx tools/test-plan-geometry-integrity.ts
 */
import assert from "node:assert/strict";
import {
  buildGeometryStall,
  findIdenticalGeometryMatches,
  formatGeometryStallComparison,
  geometriesIdentical,
  isIdenticalGeometryOverride,
  parsePlanGeometryLevels,
} from "../lib/plan-geometry-integrity";
import { savePlan, getPlanById, getPlans } from "../lib/plans";
import {
  __setPlansStoreForTests,
  createMemoryPlansStore,
} from "../lib/plans-store";
import type { TradePlan } from "../lib/plan-types";

function seedPlan(overrides: Partial<TradePlan> = {}): TradePlan {
  const now = "2026-08-15T00:00:00.000Z";
  return {
    id: "PLAN-010",
    ticker: "NFLX",
    status: "watching",
    analysisTimeframes: ["1D", "5m"],
    entryTimeframe: "5m",
    plannedEntry: 60,
    stopPrice: 55,
    targetPrice: 88,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createInput(
  overrides: Partial<Parameters<typeof savePlan>[0]> = {}
): Parameters<typeof savePlan>[0] {
  return {
    ticker: "NFLX",
    analysisTimeframes: ["1D", "5m"],
    entryTimeframe: "5m",
    plannedEntry: 60,
    stopPrice: 55,
    targetPrice: 88,
    ...overrides,
  };
}

async function withMemoryStore<T>(
  seed: TradePlan[],
  fn: () => Promise<T>
): Promise<T> {
  __setPlansStoreForTests(createMemoryPlansStore(seed));
  try {
    return await fn();
  } finally {
    __setPlansStoreForTests(null);
  }
}

async function main() {
  // Pure helpers
  assert.deepEqual(parsePlanGeometryLevels({ entry: 1, stop: 2, target: 3 }), {
    entry: 1,
    stop: 2,
    target: 3,
  });
  assert.equal(parsePlanGeometryLevels({ entry: 1, stop: 2, target: null }), null);
  assert.equal(
    geometriesIdentical(
      { entry: 1, stop: 2, target: 3 },
      { entry: 1, stop: 2, target: 3 }
    ),
    true
  );
  assert.equal(
    geometriesIdentical(
      { entry: 1, stop: 2, target: 3 },
      { entry: 1, stop: 2, target: 4 }
    ),
    false
  );
  assert.equal(isIdenticalGeometryOverride(true), true);
  assert.equal(isIdenticalGeometryOverride("OVERRIDE"), true);
  assert.equal(isIdenticalGeometryOverride(false), false);

  const sameTickerMatches = findIdenticalGeometryMatches({
    proposed: { ticker: "NFLX", entry: 60, stop: 55, target: 88 },
    existingPlans: [seedPlan()],
  });
  assert.equal(sameTickerMatches.length, 1);
  assert.equal(sameTickerMatches[0]?.existing.planId, "PLAN-010");

  const crossTickerMatches = findIdenticalGeometryMatches({
    proposed: { ticker: "AMZN", entry: 60, stop: 55, target: 88 },
    existingPlans: [seedPlan()],
  });
  assert.equal(crossTickerMatches.length, 1);
  assert.equal(crossTickerMatches[0]?.proposed.ticker, "AMZN");
  assert.equal(crossTickerMatches[0]?.existing.ticker, "NFLX");

  const stall = buildGeometryStall(crossTickerMatches)!;
  assert.equal(stall.kind, "identical_geometry");
  assert.deepEqual(stall.actions, ["CANCEL", "OVERRIDE / CREATE ANYWAY"]);
  const text = formatGeometryStallComparison(crossTickerMatches);
  assert.match(text, /EXISTING PLAN/);
  assert.match(text, /Plan ID: PLAN-010/);
  assert.match(text, /Ticker: NFLX/);
  assert.match(text, /Entry: 60/);
  assert.match(text, /Stop: 55/);
  assert.match(text, /Target: 88/);
  assert.match(text, /PROPOSED PLAN/);
  assert.match(text, /Ticker: AMZN/);
  assert.match(text, /OVERRIDE \/ CREATE ANYWAY/);

  await withMemoryStore([seedPlan()], async () => {
    // identical geometry → stall; no persist
    const stalled = await savePlan(createInput());
    assert.equal(stalled.plan, undefined);
    assert.ok(stalled.geometryStall);
    assert.match(stalled.geometryStall!.comparisonText, /EXISTING PLAN/);
    assert.match(stalled.geometryStall!.comparisonText, /PROPOSED PLAN/);
    assert.equal((await getPlans()).length, 1);
    assert.equal(await getPlanById("PLAN-011"), undefined);

    // CANCEL = do nothing further (already verified nothing created)

    // different ticker + identical geometry → same stall
    const cross = await savePlan(createInput({ ticker: "SHOP" }));
    assert.ok(cross.geometryStall);
    assert.match(cross.geometryStall!.comparisonText, /Ticker: NFLX/);
    assert.match(cross.geometryStall!.comparisonText, /Ticker: SHOP/);
    assert.equal((await getPlans()).length, 1);

    // OVERRIDE → creation allowed
    const created = await savePlan(
      createInput({
        ticker: "SHOP",
        identicalGeometryOverride: true,
      })
    );
    assert.equal(created.geometryStall, undefined);
    assert.ok(created.plan?.id);
    assert.equal(created.plan?.ticker, "SHOP");
    assert.equal(created.plan?.plannedEntry, 60);
    assert.equal((await getPlans()).length, 2);

    // different geometry → no stall
    const distinct = await savePlan(
      createInput({
        ticker: "NFLX",
        plannedEntry: 61,
        stopPrice: 55,
        targetPrice: 88,
      })
    );
    assert.equal(distinct.geometryStall, undefined);
    assert.ok(distinct.plan?.id);
  });

  console.log("test-plan-geometry-integrity: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
