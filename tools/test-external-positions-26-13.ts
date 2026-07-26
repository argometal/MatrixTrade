/**
 * Prompt 26-13 — External Positions + Capital Planner
 * Run: npm run test:external-positions
 */
import assert from "node:assert/strict";
import {
  buildCapitalAccountSnapshot,
  externalPositionsAffectMonthlyRisk,
} from "../lib/capital-account";
import {
  createExternalPosition,
  reduceExternalPosition,
  updateExternalPosition,
  upsertExternalExitPlan,
} from "../lib/external-position";
import {
  computeExternalPositionReduction,
  computeExternalPositionValuation,
} from "../lib/external-position-types";
import { __setExternalPositionStoreForTests } from "../lib/external-position-store";
import {
  validateExternalPositionCreateProposal,
  validateExternalPositionReductionProposal,
} from "../lib/external-position-validate";
import { validateProposalPayload, parseTradingInboxPayload } from "../lib/bridge";
import { applyTradingProposal } from "../lib/apply-trading-inbox";
import { computeMonthlyRisk } from "../lib/monthly-risk";
import type { Trade } from "../lib/types";

function reset() {
  __setExternalPositionStoreForTests([]);
}

async function main() {
  // 1 — create open External Position
  {
    reset();
    const p = await createExternalPosition({
      ticker: "ACME",
      shares: 100,
      averageCost: 40,
      currentPrice: 50,
      acquisitionSource: "external_program",
      liquidityStatus: "liquid",
    });
    assert.equal(p.status, "open");
    assert.equal(p.experimentEligible, false);
    assert.equal(p.scoutLinked, false);
    assert.equal(p.capitalTreatment, "invested");
    assert.equal(p.costBasis, 4000);
    assert.ok(p.id.startsWith("EXT-ACME-"));
  }

  // 2 — valuation calculations (server-owned)
  {
    const v = computeExternalPositionValuation({
      shares: 120,
      averageCost: 45,
      currentPrice: 60,
    });
    assert.equal(v.costBasis, 5400);
    assert.equal(v.currentMarketValue, 7200);
    assert.equal(v.unrealizedPnL, 1800);
    assert.equal(v.unrealizedPnLPercent, 1800 / 5400 * 100);
  }

  // 3 — exclusion from monthly risk / experiment flags
  {
    assert.equal(externalPositionsAffectMonthlyRisk(), false);
    const trades: Trade[] = [];
    const monthly = computeMonthlyRisk(trades, -300, undefined, {
      carryoverEnabled: false,
    });
    reset();
    await createExternalPosition({
      ticker: "RISK",
      shares: 50,
      averageCost: 10,
      currentPrice: 12,
    });
    const account = buildCapitalAccountSnapshot({
      externalPositions: await (
        await import("../lib/external-position-store")
      ).getExternalPositions(),
      monthlyRisk: monthly,
      totalCapital: 10_000,
    });
    // Monthly room unchanged by external invested capital
    assert.equal(account.monthlyRisk?.monthlyLossRoom, monthly.monthlyLossRoom);
    assert.equal(account.investedExternalCapital, 500);
  }

  // 4 — inclusion in investedExternalCapital
  {
    reset();
    await createExternalPosition({
      ticker: "AAA",
      shares: 10,
      averageCost: 100,
    });
    await createExternalPosition({
      ticker: "BBB",
      shares: 5,
      averageCost: 200,
    });
    const { getExternalPositions } = await import(
      "../lib/external-position-store"
    );
    const snap = buildCapitalAccountSnapshot({
      externalPositions: await getExternalPositions(),
    });
    assert.equal(snap.investedExternalCapital, 1000 + 1000);
    assert.equal(snap.openExternalPositionCount, 2);
  }

  // 5 / 6 / 7 / 8 — partial reduction, full close, realized P/L, capital release
  {
    reset();
    const created = await createExternalPosition({
      ticker: "CUT",
      shares: 100,
      averageCost: 20,
      currentPrice: 30,
    });
    const partial = await reduceExternalPosition({
      positionId: created.id,
      sharesReduced: 40,
      executionPrice: 35,
      fees: 2,
    });
    assert.equal(partial.position.status, "partially_reduced");
    assert.equal(partial.position.shares, 60);
    assert.equal(partial.reduction.proceeds, 40 * 35 - 2);
    assert.equal(partial.reduction.costBasisRemoved, 40 * 20);
    assert.equal(
      partial.reduction.realizedPnL,
      partial.reduction.proceeds - partial.reduction.costBasisRemoved
    );
    assert.equal(
      partial.position.cumulativeReleasedProceeds,
      partial.reduction.proceeds
    );

    const closed = await reduceExternalPosition({
      positionId: created.id,
      sharesReduced: 60,
      executionPrice: 32,
    });
    assert.equal(closed.position.status, "closed");
    assert.equal(closed.position.shares, 0);
    assert.equal(closed.position.capitalTreatment, "released");

    const { getExternalPositions } = await import(
      "../lib/external-position-store"
    );
    const afterClose = buildCapitalAccountSnapshot({
      externalPositions: await getExternalPositions(),
      totalCapital: 0,
      settledCashBase: 0,
    });
    assert.equal(afterClose.investedExternalCapital, 0);
    assert.equal(
      afterClose.externalReleasedProceeds,
      closed.position.cumulativeReleasedProceeds
    );
    assert.equal(
      afterClose.settledCash,
      closed.position.cumulativeReleasedProceeds
    );
  }

  // 9 — exit plan create/update
  {
    reset();
    const p = await createExternalPosition({
      ticker: "EXIT",
      shares: 120,
      averageCost: 50,
    });
    const withPlan = await upsertExternalExitPlan({
      positionId: p.id,
      targetPrice: 60,
      targetShares: 120,
      defensivePrice: 48,
      defensiveAction: "review_position",
      status: "active",
      notes: "No automatic claim that a stop order exists.",
    });
    assert.equal(withPlan.exitPlan?.status, "active");
    assert.equal(withPlan.exitPlan?.targetPrice, 60);
    const updated = await upsertExternalExitPlan({
      positionId: p.id,
      status: "draft",
      targetShares: 60,
    });
    assert.equal(updated.exitPlan?.status, "draft");
    assert.equal(updated.exitPlan?.targetShares, 60);
    assert.equal(updated.exitPlan?.targetPrice, 60);
  }

  // 10 — same ticker can coexist with Stock File / Scout / Trade identities
  {
    reset();
    const ext = await createExternalPosition({
      ticker: "SAME",
      shares: 10,
      averageCost: 1,
    });
    // Synthetic parallel identities — not merged
    const stockFileId = "ST-SAME-001";
    const scoutId = "PLAN-SAME-001";
    const tradeId = "TRD-SAME-001";
    assert.notEqual(ext.id, stockFileId);
    assert.notEqual(ext.id, scoutId);
    assert.notEqual(ext.id, tradeId);
    assert.equal(ext.scoutLinked, false);
    assert.equal(ext.experimentEligible, false);
  }

  // 11 — invalid reduction > shares
  {
    reset();
    const p = await createExternalPosition({
      ticker: "OVERR",
      shares: 10,
      averageCost: 5,
    });
    await assert.rejects(
      () =>
        reduceExternalPosition({
          positionId: p.id,
          sharesReduced: 11,
          executionPrice: 6,
        }),
      /exceeds available shares/
    );
    assert.throws(
      () =>
        computeExternalPositionReduction({
          shares: 10,
          averageCost: 5,
          sharesReduced: 11,
          executionPrice: 6,
        }),
      /exceeds available shares/
    );
  }

  // 12 — unknown liquidity
  {
    reset();
    const p = await createExternalPosition({
      ticker: "UNK",
      shares: 1,
      averageCost: 1,
      liquidityStatus: "unknown",
    });
    assert.equal(p.liquidityStatus, "unknown");
    const updated = await updateExternalPosition({
      id: p.id,
      currentPrice: 2,
    });
    assert.equal(updated.liquidityStatus, "unknown");
    assert.equal(updated.currentMarketValue, 2);
  }

  // 13 — no external positions preserves prior Capital Planner behavior (zeros)
  {
    reset();
    const empty = buildCapitalAccountSnapshot({
      externalPositions: [],
      totalCapital: 50_000,
      reservedCapital: 0,
      committedCapital: 0,
      investedScoutCapital: 0,
      liquidityBuffer: 0,
    });
    assert.equal(empty.investedExternalCapital, 0);
    assert.equal(empty.externalMarketValue, 0);
    assert.equal(empty.externalReleasedProceeds, 0);
    assert.equal(empty.openExternalPositionCount, 0);
    assert.equal(empty.availableCapital, 50_000);
    assert.equal(empty.settledCash, 50_000);
  }

  // Apply validate + accept path (memory store)
  {
    reset();
    const createPayload = {
      type: "external-position-create",
      proposal: {
        ticker: "APPLY",
        shares: 20,
        averageCost: 10,
        acquisitionSource: "manual_external",
        liquidityStatus: "liquid",
      },
    };
    const parsed = parseTradingInboxPayload(createPayload);
    assert.ok(parsed);
    const valid = validateProposalPayload(parsed!);
    assert.equal(valid.ok, true);
    const applied = await applyTradingProposal(createPayload);
    assert.equal(applied.ok, true);

    const bad = validateExternalPositionCreateProposal({
      ticker: "X",
      shares: -1,
      averageCost: 1,
      inventedKey: true,
    } as never);
    assert.equal(bad.ok, false);

    const badRed = validateExternalPositionReductionProposal({
      positionId: "EXT-X-001",
      sharesReduced: 0,
      executionPrice: 1,
    });
    assert.equal(badRed.ok, false);
  }

  __setExternalPositionStoreForTests(null);
  console.log("test-external-positions-26-13: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
