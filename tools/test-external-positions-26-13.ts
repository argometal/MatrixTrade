/**
 * Prompt 26-13 / harden 26-14 — External Positions + Capital Planner
 * Run: npm run test:external-positions
 */
import assert from "node:assert/strict";
import {
  buildCapitalAccountSnapshot,
  capitalFieldValue,
  externalPositionsAffectMonthlyRisk,
} from "../lib/capital-account";
import {
  createExternalPosition,
  reduceExternalPosition,
  settleExternalPositionProceeds,
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
    assert.equal(p.costBasisMethod, "average_cost");
    assert.equal(p.valuationSource, "manual");
    assert.ok(p.lastValuationAt);
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
    assert.equal(v.unrealizedPnLPercent, (1800 / 5400) * 100);
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
    assert.equal(account.monthlyRisk?.monthlyLossRoom, monthly.monthlyLossRoom);
    assert.equal(capitalFieldValue(account.investedExternalCapital), 500);
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
    assert.equal(capitalFieldValue(snap.investedExternalCapital), 1000 + 1000);
    assert.equal(snap.openExternalPositionCount, 2);
    // Global fields unconfigured — not known zero
    assert.equal(snap.totalCapital.status, "unconfigured");
    assert.equal(snap.settledCash.status, "unconfigured");
    assert.equal(snap.reservedCapital.status, "unconfigured");
    assert.equal(snap.committedCapital.status, "unconfigured");
    assert.equal(snap.investedScoutCapital.status, "unconfigured");
  }

  // 5 / 6 — partial reduction + full close with pending settlement (not cash)
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
      reductionId: "CUT-RED-001",
      sharesReduced: 40,
      executionPrice: 35,
      fees: 2,
    });
    assert.equal(partial.position.status, "partially_reduced");
    assert.equal(partial.position.shares, 60);
    assert.equal(partial.reduction.proceeds, 40 * 35 - 2);
    assert.equal(partial.reduction.settlementStatus, "pending_settlement");
    assert.equal(
      partial.position.cumulativeSaleProceeds,
      partial.reduction.proceeds
    );

    const closed = await reduceExternalPosition({
      positionId: created.id,
      reductionId: "CUT-RED-002",
      sharesReduced: 60,
      executionPrice: 32,
    });
    assert.equal(closed.position.status, "closed");
    assert.equal(closed.position.shares, 0);
    assert.equal(closed.position.capitalTreatment, "pending_release");

    const { getExternalPositions } = await import(
      "../lib/external-position-store"
    );
    const afterClose = buildCapitalAccountSnapshot({
      externalPositions: await getExternalPositions(),
      settledCashBase: 0,
    });
    assert.equal(capitalFieldValue(afterClose.investedExternalCapital), 0);
    assert.equal(
      capitalFieldValue(afterClose.pendingSettlementProceeds),
      closed.position.cumulativeSaleProceeds
    );
    // Pending settlement must NOT increase settled cash
    assert.equal(capitalFieldValue(afterClose.settledCash), 0);
    assert.equal(capitalFieldValue(afterClose.settledExternalProceeds), 0);
  }

  // 7 — settlement increases settled cash exactly once; no double-count across snapshots
  {
    reset();
    const created = await createExternalPosition({
      ticker: "SETL",
      shares: 10,
      averageCost: 10,
    });
    const { reduction } = await reduceExternalPosition({
      positionId: created.id,
      reductionId: "SETL-1",
      sharesReduced: 10,
      executionPrice: 12,
    });
    const { getExternalPositions } = await import(
      "../lib/external-position-store"
    );
    const pendingSnap = buildCapitalAccountSnapshot({
      externalPositions: await getExternalPositions(),
      settledCashBase: 100,
    });
    assert.equal(capitalFieldValue(pendingSnap.settledCash), 100);
    assert.equal(
      capitalFieldValue(pendingSnap.pendingSettlementProceeds),
      reduction.proceeds
    );

    await settleExternalPositionProceeds({
      positionId: created.id,
      reductionId: "SETL-1",
    });
    const settled1 = buildCapitalAccountSnapshot({
      externalPositions: await getExternalPositions(),
      settledCashBase: 100,
    });
    const settled2 = buildCapitalAccountSnapshot({
      externalPositions: await getExternalPositions(),
      settledCashBase: 100,
    });
    assert.equal(
      capitalFieldValue(settled1.settledCash),
      100 + reduction.proceeds
    );
    assert.equal(
      capitalFieldValue(settled2.settledCash),
      capitalFieldValue(settled1.settledCash)
    );
    assert.equal(capitalFieldValue(settled1.pendingSettlementProceeds), 0);
    assert.equal(
      capitalFieldValue(settled1.settledExternalProceeds),
      reduction.proceeds
    );

    // Re-settle is idempotent for cash (ledger already settled)
    await settleExternalPositionProceeds({
      positionId: created.id,
      reductionId: "SETL-1",
    });
    const settled3 = buildCapitalAccountSnapshot({
      externalPositions: await getExternalPositions(),
      settledCashBase: 100,
    });
    assert.equal(
      capitalFieldValue(settled3.settledCash),
      100 + reduction.proceeds
    );

    const pos = (await getExternalPositions())[0];
    assert.equal(pos.capitalTreatment, "released");
  }

  // 8 — repeated reduction Apply is idempotent
  {
    reset();
    const created = await createExternalPosition({
      ticker: "IDEM",
      shares: 100,
      averageCost: 10,
    });
    const first = await reduceExternalPosition({
      positionId: created.id,
      reductionId: "IDEM-R1",
      sharesReduced: 25,
      executionPrice: 12,
      fees: 1,
    });
    const second = await reduceExternalPosition({
      positionId: created.id,
      reductionId: "IDEM-R1",
      sharesReduced: 25,
      executionPrice: 12,
      fees: 1,
    });
    assert.equal(second.idempotentReplay, true);
    assert.equal(second.position.shares, 75);
    assert.equal(second.position.reductions.length, 1);
    assert.equal(second.reduction.id, first.reduction.id);
  }

  // 9 — conflicting duplicate reduction reference is rejected
  {
    reset();
    const created = await createExternalPosition({
      ticker: "CONF",
      shares: 100,
      averageCost: 10,
    });
    await reduceExternalPosition({
      positionId: created.id,
      executionReference: "BROKER-99",
      sharesReduced: 10,
      executionPrice: 11,
    });
    await assert.rejects(
      () =>
        reduceExternalPosition({
          positionId: created.id,
          executionReference: "BROKER-99",
          sharesReduced: 20,
          executionPrice: 11,
        }),
      /conflicting payload/
    );
    const { getExternalPositionById } = await import(
      "../lib/external-position-store"
    );
    const pos = await getExternalPositionById(created.id);
    assert.equal(pos?.shares, 90);
    assert.equal(pos?.reductions.length, 1);
  }

  // 10 — concurrent reductions cannot oversell
  {
    reset();
    const created = await createExternalPosition({
      ticker: "RACE",
      shares: 100,
      averageCost: 10,
    });
    const results = await Promise.allSettled([
      reduceExternalPosition({
        positionId: created.id,
        reductionId: "RACE-A",
        sharesReduced: 100,
        executionPrice: 11,
      }),
      reduceExternalPosition({
        positionId: created.id,
        reductionId: "RACE-B",
        sharesReduced: 100,
        executionPrice: 11,
      }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    const { getExternalPositionById } = await import(
      "../lib/external-position-store"
    );
    const pos = await getExternalPositionById(created.id);
    assert.equal(pos?.shares, 0);
    assert.equal(pos?.status, "closed");
    assert.equal(pos?.reductions.length, 1);
  }

  // 11 — note-only update does not refresh valuation timestamp
  {
    reset();
    const created = await createExternalPosition({
      ticker: "NOTE",
      shares: 10,
      averageCost: 5,
      currentPrice: 6,
    });
    const valuationAt = created.lastValuationAt;
    assert.ok(valuationAt);
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateExternalPosition({
      id: created.id,
      notes: "review later",
      reviewAt: "2026-08-01T00:00:00.000Z",
    });
    assert.equal(updated.lastValuationAt, valuationAt);
    assert.equal(updated.notes, "review later");
    const priced = await updateExternalPosition({
      id: created.id,
      currentPrice: 7,
    });
    assert.notEqual(priced.lastValuationAt, valuationAt);
    assert.equal(priced.currentPrice, 7);
  }

  // 12 — exit plan create/update + targetShares > remaining rejected
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
    await assert.rejects(
      () =>
        upsertExternalExitPlan({
          positionId: p.id,
          targetShares: 121,
        }),
      /exceeds current position shares/
    );

    // Close then reject active exit plan
    await reduceExternalPosition({
      positionId: p.id,
      reductionId: "EXIT-CLOSE",
      sharesReduced: 120,
      executionPrice: 55,
    });
    await assert.rejects(
      () =>
        upsertExternalExitPlan({
          positionId: p.id,
          status: "active",
          targetShares: 1,
        }),
      /cannot receive an active exit plan/
    );
  }

  // 13 — same ticker can coexist with Stock File / Scout / Trade identities
  {
    reset();
    const ext = await createExternalPosition({
      ticker: "SAME",
      shares: 10,
      averageCost: 1,
    });
    const stockFileId = "ST-SAME-001";
    const scoutId = "PLAN-SAME-001";
    const tradeId = "TRD-SAME-001";
    assert.notEqual(ext.id, stockFileId);
    assert.notEqual(ext.id, scoutId);
    assert.notEqual(ext.id, tradeId);
    assert.equal(ext.scoutLinked, false);
    assert.equal(ext.experimentEligible, false);
  }

  // 14 — invalid reduction > shares
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
          reductionId: "OVERR-1",
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

  // 15 — unknown liquidity + price must be positive
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
    assert.equal(updated.currentMarketValue, 2);
    await assert.rejects(
      () => updateExternalPosition({ id: p.id, currentPrice: 0 }),
      /positive number/
    );
  }

  // 16 — configured empty planner with wired base; unconfigured when incomplete
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
    assert.equal(capitalFieldValue(empty.investedExternalCapital), 0);
    assert.equal(capitalFieldValue(empty.externalMarketValue), 0);
    assert.equal(capitalFieldValue(empty.settledExternalProceeds), 0);
    assert.equal(empty.openExternalPositionCount, 0);
    assert.equal(capitalFieldValue(empty.availableCapital), 50_000);
    assert.equal(capitalFieldValue(empty.settledCash), 50_000);

    const partial = buildCapitalAccountSnapshot({ externalPositions: [] });
    assert.equal(partial.completeness, "partial_external_only");
    assert.equal(partial.totalCapital.status, "unconfigured");
    assert.equal(partial.settledCash.status, "unconfigured");
    assert.equal(capitalFieldValue(partial.settledCash), undefined);
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

    const needId = validateExternalPositionReductionProposal({
      positionId: "EXT-X-001",
      sharesReduced: 1,
      executionPrice: 1,
    });
    assert.equal(needId.ok, false);

    const zeroPrice = validateExternalPositionCreateProposal({
      ticker: "Z",
      shares: 1,
      averageCost: 1,
      currentPrice: 0,
    });
    assert.equal(zeroPrice.ok, false);
  }

  __setExternalPositionStoreForTests(null);
  console.log("test-external-positions-26-13: ok (26-14 hardened)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
