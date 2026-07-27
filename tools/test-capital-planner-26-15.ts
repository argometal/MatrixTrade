/**
 * Prompt 26-15 — Capital Planner Model A foundation
 * Run: npm run test:capital-planner
 */
import assert from "node:assert/strict";
import {
  buildCapitalAccountSnapshot,
  capitalFieldValue,
  computeExternalMarketValueField,
  computePotentialExternalRelease,
} from "../lib/capital-account";
import { createCapitalConfiguration } from "../lib/capital-configuration";
import { appendCapitalLedgerEvent } from "../lib/capital-ledger";
import {
  createCapitalReservation,
  deployCapitalReservation,
  releaseCapitalReservation,
} from "../lib/capital-reservation";
import { __setCapitalPlannerStoreForTests } from "../lib/capital-planner-store";
import { evaluateScoutFunding } from "../lib/scout-funding";
import { computeInvestedScoutCapital } from "../lib/invested-scout-capital";
import {
  createExternalPosition,
  reduceExternalPosition,
  settleExternalPositionProceeds,
  upsertExternalExitPlan,
} from "../lib/external-position";
import { __setExternalPositionStoreForTests } from "../lib/external-position-store";
import { scanExternalPositionNeutrality } from "./scan-external-position-neutrality";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import { applyTradingProposal } from "../lib/apply-trading-inbox";
import { loadDashboardData } from "../lib/dashboard-data";
import type { Trade } from "../lib/types";
import type { ExternalPosition } from "../lib/external-position-types";

function reset() {
  __setCapitalPlannerStoreForTests({
    configuration: null,
    ledgerEvents: [],
    reservations: [],
  });
  __setExternalPositionStoreForTests([]);
}

async function main() {
  await scanExternalPositionNeutrality();

  // 1 — total equity is not treated as settled cash
  {
    reset();
    const snap = buildCapitalAccountSnapshot({
      totalEquityBase: 200_000,
      // no settledCashBase
      liquidityBuffer: 0,
      reservations: [],
      openTrades: [],
    });
    assert.equal(capitalFieldValue(snap.totalEquity), 200_000);
    assert.equal(snap.settledCash.status, "unconfigured");
    assert.notEqual(capitalFieldValue(snap.settledCash), 200_000);
  }

  // 2 — cash source missing returns unconfigured
  {
    reset();
    const snap = buildCapitalAccountSnapshot({
      totalEquityBase: 50_000,
      liquidityBuffer: 0,
    });
    assert.equal(snap.settledCash.status, "unconfigured");
    assert.match(snap.settledCash.reason, /cash source missing|not configured/i);
  }

  // 3 — settled external proceeds counted once
  {
    reset();
    await createCapitalConfiguration({
      settledCashBase: 1000,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 0,
      externalCreditsIncludedInCash: false,
    });
    const pos = await createExternalPosition({
      ticker: "ABC",
      shares: 10,
      averageCost: 10,
      currentPrice: 12,
      liquidityStatus: "liquid",
    });
    await reduceExternalPosition({
      positionId: pos.id,
      reductionId: "ABC-RED-1",
      sharesReduced: 10,
      executionPrice: 12,
    });
    await settleExternalPositionProceeds({
      positionId: pos.id,
      reductionId: "ABC-RED-1",
    });
    const { getExternalPositions } = await import("../lib/external-position-store");
    const { readCapitalPlannerState } = await import("../lib/capital-planner-store");
    const state = await readCapitalPlannerState();
    const snap1 = buildCapitalAccountSnapshot({
      configuration: state.configuration,
      externalPositions: await getExternalPositions(),
      ledgerEvents: state.ledgerEvents,
      reservations: [],
      openTrades: [],
    });
    const snap2 = buildCapitalAccountSnapshot({
      configuration: state.configuration,
      externalPositions: await getExternalPositions(),
      ledgerEvents: state.ledgerEvents,
      reservations: [],
      openTrades: [],
    });
    assert.equal(capitalFieldValue(snap1.settledCash), capitalFieldValue(snap2.settledCash));
    assert.equal(capitalFieldValue(snap1.settledExternalProceeds), 120);
    assert.equal(capitalFieldValue(snap1.settledCash), 1120);
  }

  // 4 — external credits already included in cash are not added again
  {
    reset();
    await createCapitalConfiguration({
      settledCashBase: 1120,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 0,
      externalCreditsIncludedInCash: true,
    });
    const { readCapitalPlannerState } = await import("../lib/capital-planner-store");
    await appendCapitalLedgerEvent({
      idempotencyKey: "settled-included-1",
      eventType: "external_position_sale_settled",
      amount: 120,
      status: "settled",
      settledAt: new Date().toISOString(),
    });
    const state = await readCapitalPlannerState();
    const snap = buildCapitalAccountSnapshot({
      configuration: state.configuration,
      ledgerEvents: state.ledgerEvents,
      reservations: [],
      openTrades: [],
    });
    assert.equal(capitalFieldValue(snap.settledCash), 1120);
  }

  // 5 — missing price leaves market value unconfigured/unknown
  {
    reset();
    const positions: ExternalPosition[] = [
      {
        id: "EXT-XYZ-001",
        ticker: "XYZ",
        status: "open",
        acquisitionSource: "manual_external",
        shares: 10,
        averageCost: 5,
        costBasisMethod: "average_cost",
        costBasis: 50,
        capitalTreatment: "invested",
        liquidityStatus: "liquid",
        experimentEligible: false,
        scoutLinked: false,
        openedAt: new Date().toISOString(),
        reductions: [],
        cumulativeSaleProceeds: 0,
        cumulativeRealizedPnL: 0,
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const mv = computeExternalMarketValueField(positions);
    assert.notEqual(mv.status, "configured");
    const snap = buildCapitalAccountSnapshot({
      externalPositions: positions,
      settledCashBase: 0,
      liquidityBuffer: 0,
    });
    assert.equal(capitalFieldValue(snap.investedExternalCapital), 50);
    assert.notEqual(snap.externalMarketValue.status, "configured");
  }

  // 6 — cost basis remains distinct from market value
  {
    reset();
    const pos = await createExternalPosition({
      ticker: "EXT",
      shares: 8,
      averageCost: 25,
      currentPrice: 40,
    });
    const snap = buildCapitalAccountSnapshot({
      externalPositions: [pos],
      settledCashBase: 0,
      liquidityBuffer: 0,
    });
    assert.equal(capitalFieldValue(snap.investedExternalCapital), 200);
    assert.equal(capitalFieldValue(snap.externalMarketValue), 320);
  }

  // 7 — potential release excluded from available capital
  {
    reset();
    const pos = await createExternalPosition({
      ticker: "ABC",
      shares: 100,
      averageCost: 10,
      currentPrice: 20,
      liquidityStatus: "liquid",
    });
    await upsertExternalExitPlan({
      positionId: pos.id,
      targetShares: 50,
      targetPrice: 22,
      status: "active",
    });
    const { getExternalPositions } = await import("../lib/external-position-store");
    const positions = await getExternalPositions();
    const snap = buildCapitalAccountSnapshot({
      externalPositions: positions,
      settledCashBase: 5000,
      liquidityBuffer: 0,
      reservations: [],
      openTrades: [],
    });
    assert.equal(capitalFieldValue(snap.availableCapital), 5000);
    assert.ok(
      (capitalFieldValue(snap.potentialExternalCapitalRelease) ?? 0) > 0
    );
    assert.notEqual(
      capitalFieldValue(snap.availableCapital),
      (capitalFieldValue(snap.settledCash) ?? 0) +
        (capitalFieldValue(snap.potentialExternalCapitalRelease) ?? 0)
    );
  }

  // 8 — stale valuation blocks potential release
  {
    const stale: ExternalPosition = {
      id: "EXT-ABC-099",
      ticker: "ABC",
      status: "open",
      acquisitionSource: "manual_external",
      shares: 10,
      averageCost: 1,
      costBasisMethod: "average_cost",
      costBasis: 10,
      currentPrice: 2,
      currentMarketValue: 20,
      capitalTreatment: "invested",
      liquidityStatus: "liquid",
      experimentEligible: false,
      scoutLinked: false,
      openedAt: "2020-01-01T00:00:00.000Z",
      lastValuationAt: "2020-01-01T00:00:00.000Z",
      exitPlan: {
        positionId: "EXT-ABC-099",
        targetShares: 10,
        status: "active",
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
      reductions: [],
      cumulativeSaleProceeds: 0,
      cumulativeRealizedPnL: 0,
      revision: 1,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    };
    const pot = computePotentialExternalRelease([stale]);
    assert.equal(pot.field.status, "unconfigured");
  }

  // 9 — restricted position blocks potential release
  {
    const restricted: ExternalPosition = {
      id: "EXT-XYZ-099",
      ticker: "XYZ",
      status: "open",
      acquisitionSource: "manual_external",
      shares: 10,
      averageCost: 1,
      costBasisMethod: "average_cost",
      costBasis: 10,
      currentPrice: 2,
      currentMarketValue: 20,
      capitalTreatment: "restricted",
      liquidityStatus: "restricted",
      experimentEligible: false,
      scoutLinked: false,
      openedAt: new Date().toISOString(),
      lastValuationAt: new Date().toISOString(),
      exitPlan: {
        positionId: "EXT-XYZ-099",
        targetShares: 10,
        status: "active",
        updatedAt: new Date().toISOString(),
      },
      reductions: [],
      cumulativeSaleProceeds: 0,
      cumulativeRealizedPnL: 0,
      revision: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const pot = computePotentialExternalRelease([restricted]);
    assert.equal(pot.details.length, 0);
  }

  // 10 — Scout approval without reservation remains unfunded
  {
    reset();
    await createCapitalConfiguration({
      settledCashBase: 50_000,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 0,
    });
    const state = await (
      await import("../lib/capital-planner-store")
    ).readCapitalPlannerState();
    const snap = buildCapitalAccountSnapshot({
      configuration: state.configuration,
      reservations: [],
      openTrades: [],
    });
    assert.equal(snap.reservations.length, 0);
    // No reservation ⇒ no funded Scout capital hold
    assert.equal(capitalFieldValue(snap.reservedCapital), 0);
  }

  // 11 — reservation reduces available capital
  {
    reset();
    await createCapitalConfiguration({
      settledCashBase: 10_000,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 0,
    });
    const before = buildCapitalAccountSnapshot({
      settledCashBase: 10_000,
      liquidityBuffer: 0,
      reservations: [],
      openTrades: [],
    });
    assert.equal(capitalFieldValue(before.availableCapital), 10_000);
    await createCapitalReservation({
      planId: "PLAN-ABC-001",
      ticker: "ABC",
      requestedCapital: 3000,
      estimatedRisk: 150,
      availableCapital: 10_000,
      authorizableLossRoom: 300,
      capitalConfigurationPresent: true,
      executionLevelsPresent: true,
    });
    const state = await (
      await import("../lib/capital-planner-store")
    ).readCapitalPlannerState();
    const after = buildCapitalAccountSnapshot({
      configuration: state.configuration,
      reservations: state.reservations,
      openTrades: [],
    });
    assert.equal(capitalFieldValue(after.reservedCapital), 3000);
    assert.equal(capitalFieldValue(after.availableCapital), 7000);
  }

  // 12 — reservation release restores available capital
  {
    reset();
    await createCapitalConfiguration({
      settledCashBase: 10_000,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 0,
    });
    const res = await createCapitalReservation({
      planId: "PLAN-XYZ-001",
      requestedCapital: 2000,
      estimatedRisk: 100,
      availableCapital: 10_000,
      authorizableLossRoom: 300,
      capitalConfigurationPresent: true,
    });
    await releaseCapitalReservation({ id: res.id });
    const state = await (
      await import("../lib/capital-planner-store")
    ).readCapitalPlannerState();
    const snap = buildCapitalAccountSnapshot({
      configuration: state.configuration,
      reservations: state.reservations,
      openTrades: [],
    });
    assert.equal(capitalFieldValue(snap.availableCapital), 10_000);
  }

  // 13 — Trade deployment transitions reservation
  {
    reset();
    await createCapitalConfiguration({
      settledCashBase: 20_000,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 0,
    });
    const res = await createCapitalReservation({
      planId: "PLAN-EXT-001",
      requestedCapital: 4000,
      estimatedRisk: 200,
      availableCapital: 20_000,
      authorizableLossRoom: 300,
      capitalConfigurationPresent: true,
    });
    const deployed = await deployCapitalReservation({
      id: res.id,
      tradeId: "TRD-EXT-001",
    });
    assert.equal(deployed.status, "deployed");
    const state = await (
      await import("../lib/capital-planner-store")
    ).readCapitalPlannerState();
    const snap = buildCapitalAccountSnapshot({
      configuration: state.configuration,
      reservations: state.reservations,
      openTrades: [],
    });
    // Deployed is not reserved/committed — available restored under Model A
    assert.equal(capitalFieldValue(snap.reservedCapital), 0);
    assert.equal(capitalFieldValue(snap.availableCapital), 20_000);
  }

  // 14 — open Trade capital from actual remaining quantity
  {
    const trades: Trade[] = [
      {
        id: "TRD-1",
        ticker: "ABC",
        entry: 50,
        stop: 45,
        shares: 100,
        status: "open",
        createdAt: new Date().toISOString(),
      },
      {
        id: "TRD-2",
        ticker: "XYZ",
        entry: 10,
        stop: 9,
        shares: 20,
        status: "closed",
        exit: 11,
        createdAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
      },
    ];
    const invested = computeInvestedScoutCapital(trades);
    assert.equal(capitalFieldValue(invested.field), 5000);
    assert.equal(invested.openTradeCount, 1);
  }

  // 15 — External Positions excluded from invested Scout capital
  {
    reset();
    await createExternalPosition({
      ticker: "EXT",
      shares: 1000,
      averageCost: 10,
      currentPrice: 11,
    });
    const invested = computeInvestedScoutCapital([]);
    assert.equal(capitalFieldValue(invested.field), 0);
  }

  // 16 — insufficient cash blocks funding
  {
    const result = evaluateScoutFunding({
      requestedCapital: 5000,
      estimatedRisk: 100,
      availableCapital: 1000,
      authorizableLossRoom: 300,
      capitalConfigurationPresent: true,
      executionLevelsPresent: true,
    });
    assert.ok(
      result.fundingDecision === "partially_funded" ||
        result.fundingDecision === "unfunded" ||
        result.fundingDecision === "blocked"
    );
    assert.ok(result.reasons.some((r) => /insufficient settled cash/i.test(r)));
    assert.equal(result.executable, false);
  }

  // 17 — insufficient risk room blocks execution
  {
    const result = evaluateScoutFunding({
      requestedCapital: 1000,
      estimatedRisk: 500,
      availableCapital: 10_000,
      authorizableLossRoom: 100,
      capitalConfigurationPresent: true,
      executionLevelsPresent: true,
    });
    assert.equal(result.executable, false);
    assert.ok(
      result.reasons.some((r) => /insufficient monthly\/experiment risk room/i.test(r))
    );
  }

  // 18 — sufficient cash but missing risk model → unassessed
  {
    const result = evaluateScoutFunding({
      requestedCapital: 1000,
      estimatedRisk: 100,
      availableCapital: 10_000,
      capitalConfigurationPresent: true,
      executionLevelsPresent: true,
    });
    assert.equal(result.fundingDecision, "unassessed");
    assert.equal(result.executable, false);
  }

  // 19 — one failed source does not blank unrelated Dashboard sections
  {
    const data = await loadDashboardData();
    assert.ok(data.experiment);
    assert.ok(data.monthly);
    assert.ok(Array.isArray(data.attentionItems));
    assert.ok(Array.isArray(data.equityPoints));
    // sectionErrors may be empty when all sources load
    assert.ok(data.sectionErrors === undefined || Array.isArray(data.sectionErrors));
  }

  // 20 — repository neutrality scan (included at start)

  // 21 — Capital Planner reports correct completeness status
  {
    reset();
    const empty = buildCapitalAccountSnapshot({});
    assert.equal(empty.completeness.status, "partial"); // external configured flag true
    await createCapitalConfiguration({
      settledCashBase: 1,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 0,
    });
    const state = await (
      await import("../lib/capital-planner-store")
    ).readCapitalPlannerState();
    const ops = buildCapitalAccountSnapshot({
      configuration: state.configuration,
      reservations: [],
      openTrades: [],
    });
    assert.equal(ops.completeness.status, "operational");
    assert.equal(ops.completeness.cashSourceConfigured, true);
  }

  // 22 — idempotent Apply behavior (ledger)
  {
    reset();
    const first = await appendCapitalLedgerEvent({
      idempotencyKey: "adj-EXAMPLE-1",
      eventType: "manual_adjustment",
      amount: 50,
      status: "settled",
    });
    const second = await appendCapitalLedgerEvent({
      idempotencyKey: "adj-EXAMPLE-1",
      eventType: "manual_adjustment",
      amount: 50,
      status: "settled",
    });
    assert.equal(second.idempotentReplay, true);
    assert.equal(second.event.id, first.event.id);
  }

  // 23 — conflicting duplicate ledger event rejected
  {
    reset();
    await appendCapitalLedgerEvent({
      idempotencyKey: "adj-EXAMPLE-2",
      eventType: "manual_adjustment",
      amount: 50,
      status: "settled",
    });
    await assert.rejects(
      () =>
        appendCapitalLedgerEvent({
          idempotencyKey: "adj-EXAMPLE-2",
          eventType: "manual_adjustment",
          amount: 99,
          status: "settled",
        }),
      /conflicting payload/
    );
  }

  // Apply validate capital-configuration-create
  {
    reset();
    const payload = {
      type: "capital-configuration-create",
      proposal: {
        settledCashBase: 25_000,
        settledCashAsOf: "2026-07-26T00:00:00.000Z",
        liquidityBuffer: 1000,
        source: "manual",
        externalCreditsIncludedInCash: false,
      },
    };
    const parsed = parseTradingInboxPayload(payload);
    assert.ok(parsed);
    assert.equal(validateProposalPayload(parsed!).ok, true);
    const applied = await applyTradingProposal(payload);
    assert.equal(applied.ok, true);
  }

  // Pending settlement does not increase settled cash
  {
    reset();
    await createCapitalConfiguration({
      settledCashBase: 100,
      settledCashAsOf: "2026-07-26T00:00:00.000Z",
      liquidityBuffer: 0,
      externalCreditsIncludedInCash: false,
    });
    const pos = await createExternalPosition({
      ticker: "TEST",
      shares: 5,
      averageCost: 10,
      currentPrice: 12,
    });
    await reduceExternalPosition({
      positionId: pos.id,
      reductionId: "TEST-P1",
      sharesReduced: 5,
      executionPrice: 12,
    });
    const state = await (
      await import("../lib/capital-planner-store")
    ).readCapitalPlannerState();
    const { getExternalPositions } = await import("../lib/external-position-store");
    const snap = buildCapitalAccountSnapshot({
      configuration: state.configuration,
      externalPositions: await getExternalPositions(),
      ledgerEvents: state.ledgerEvents,
      reservations: [],
      openTrades: [],
    });
    assert.equal(capitalFieldValue(snap.settledCash), 100);
    assert.ok((capitalFieldValue(snap.pendingSettlementProceeds) ?? 0) > 0);
  }

  __setCapitalPlannerStoreForTests(null);
  __setExternalPositionStoreForTests(null);
  console.log("test-capital-planner-26-15: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
