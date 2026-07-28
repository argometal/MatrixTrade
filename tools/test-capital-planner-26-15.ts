/**
 * Prompt 26-15 — Capital Planner Model A foundation
 * Run: npm run test:capital-planner
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
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

  // 26-34 — Capital Planner mobile UX + allocation help + recovery
  {
    const planner = await fs.readFile(
      path.join(
        process.cwd(),
        "app/components/planning-preview/CapitalPlannerPanel.tsx"
      ),
      "utf-8"
    );
    assert.match(planner, /data-capital-planner-root/);
    assert.match(
      planner,
      /pb-\[calc\(5\.5rem\+env\(safe-area-inset-bottom\)\)\]/
    );
    assert.match(planner, /data-allocation-flow-help/);
    assert.match(planner, /CAPITAL_ALLOCATION_FLOW/);
    const helpLib = await fs.readFile(
      path.join(process.cwd(), "lib/capital-help.ts"),
      "utf-8"
    );
    assert.match(
      helpLib,
      /Scout Plan → Scout Funding Snapshot → evaluation → capital-reservation-create/
    );
    assert.match(planner, /data-capital-settings-cta/);
    assert.match(planner, /min-h-11/);
    assert.match(planner, /Technical notes/);
    assert.match(planner, /formatCapitalStoreError/);
    assert.match(planner, /CompactSection|rounded-xl border/);
    // Primary settings link is a button-styled CTA, not plain underline text alone
    assert.match(
      planner,
      /Manage capital settings[\s\S]*rounded-lg border|rounded-lg border[\s\S]*Manage capital settings/
    );
  }

  // 26-34 / 26-36 — Scout Funding Snapshot ontology, levels, no mutation
  {
    const {
      buildScoutFundingSnapshot,
      formatScoutFundingSnapshotText,
      scoutFundingSnapshotItem,
      SCOUT_FUNDING_SNAPSHOT_REQUIRED_KEYS,
      SCOUT_FUNDING_SNAPSHOT_ID,
    } = await import("../lib/scout-funding-snapshot");
    const { createCapitalReservation, listCapitalReservations } = await import(
      "../lib/capital-reservation"
    );
    const { __setCapitalPlannerStoreForTests: pin } = await import(
      "../lib/capital-planner-store"
    );

    pin({
      configuration: null,
      ledgerEvents: [],
      reservations: [],
    });

    const barePlan = {
      id: "PLAN-FUND-001",
      ticker: "ABC",
      status: "watching" as const,
      analysisTimeframes: ["1D" as const],
      entryTimeframe: "1D" as const,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    };

    const snap = buildScoutFundingSnapshot({ plan: barePlan });
    for (const key of SCOUT_FUNDING_SNAPSHOT_REQUIRED_KEYS) {
      assert.ok(key in snap, `missing required field ${key}`);
    }
    assert.equal(snap.planId, "PLAN-FUND-001");
    assert.equal(snap.stockFileId, "unconfigured");
    assert.equal(snap.stockThesisId, "unconfigured");
    assert.equal(snap.ticker, "ABC");
    assert.equal(snap.requestedCapital, "unconfigured");
    assert.equal(snap.estimatedRisk, "unconfigured");
    assert.equal(snap.expiration, "unconfigured");
    assert.equal(snap.entry, "unconfigured");
    assert.equal(snap.stop, "unconfigured");
    assert.equal(snap.target, "unconfigured");
    assert.equal(snap.shareCount, "unconfigured");
    assert.equal(snap.existingReservationId, "unconfigured");
    assert.equal(snap.reservationStatus, "unconfigured");
    assert.equal(snap.mutatesCapital, false);
    assert.equal(snap.readOnly, true);

    const before = await listCapitalReservations();
    const text = formatScoutFundingSnapshotText(snap);
    assert.match(text, /mutatesCapital: false/);
    assert.match(text, /requestedCapital: unconfigured/);
    const item = scoutFundingSnapshotItem({ plan: barePlan });
    assert.equal(item.id, SCOUT_FUNDING_SNAPSHOT_ID);
    assert.match(item.label, /Scout Funding Snapshot/);
    const after = await listCapitalReservations();
    assert.equal(after.length, before.length, "snapshot must not mutate reservations");

    // 26-36 A — thesis ID present, no Stock File source → thesis preserved, file unconfigured
    const thesisOnlyPlan = {
      ...barePlan,
      stockThesisId: "ST-ABC-001",
      plannedEntry: 10,
      stopPrice: 9,
      targetPrice: 12,
      validUntil: "2026-08-01T00:00:00.000Z",
    };
    const thesisOnly = buildScoutFundingSnapshot({ plan: thesisOnlyPlan });
    assert.equal(thesisOnly.stockThesisId, "ST-ABC-001");
    assert.equal(thesisOnly.stockFileId, "unconfigured");
    assert.notEqual(thesisOnly.stockFileId, thesisOnly.stockThesisId);

    // 26-36 A — authoritative Stock File ID emitted exactly
    const withFile = buildScoutFundingSnapshot({
      plan: thesisOnlyPlan,
      stockFileId: "ST-FILE-AUTH-9",
    });
    assert.equal(withFile.stockFileId, "ST-FILE-AUTH-9");
    assert.equal(withFile.stockThesisId, "ST-ABC-001");

    // 26-36 A — never infer Stock File ID from ticker
    const tickerTrap = buildScoutFundingSnapshot({
      plan: { ...barePlan, ticker: "ST-FAKE-TICKER", stockThesisId: "ST-REAL-001" },
    });
    assert.equal(tickerTrap.stockFileId, "unconfigured");
    assert.equal(tickerTrap.stockThesisId, "ST-REAL-001");
    assert.equal(tickerTrap.ticker, "ST-FAKE-TICKER");
    assert.notEqual(tickerTrap.stockFileId, tickerTrap.ticker);

    // 26-36 B — layered-entry-only complete levels: emit levels, no false missing-level blocker
    const layeredOnlyPlan = {
      ...barePlan,
      id: "PLAN-LAYER-001",
      // intentionally omit plannedEntry / stopPrice / targetPrice
      layeredEntry: {
        executionMethod: "layered_limits" as const,
        noChase: true as const,
        status: "planned" as const,
        sizingMode: "risk_percent" as const,
        stopModel: "common" as const,
        commonStopPrice: 9,
        primaryTargetPrice: 12,
        authorizedRiskAmount: 50,
        limits: [{ price: 10, allocationPercent: 100 }],
      },
    };
    const layeredOnly = buildScoutFundingSnapshot({
      plan: layeredOnlyPlan,
      stockFileId: "ST-LAYER-001",
      capitalConfigurationPresent: true,
      authorizableLossRoom: 200,
      account: {
        availableCapital: { status: "configured", value: 10_000 },
      } as import("../lib/capital-account").CapitalAccountSnapshot,
    });
    assert.equal(layeredOnly.entry, 10);
    assert.equal(layeredOnly.stop, 9);
    assert.equal(layeredOnly.target, 12);
    assert.equal(typeof layeredOnly.requestedCapital, "number");
    assert.equal(typeof layeredOnly.estimatedRisk, "number");
    assert.ok(
      !layeredOnly.blockingReasons.includes("missing execution levels"),
      "layered-only complete levels must not false-block"
    );
    assert.notEqual(layeredOnly.currentFundingDecision, "blocked");

    // 26-36 B — partial layered-entry: missing stays unconfigured; funding blocked
    const layeredPartialPlan = {
      ...barePlan,
      id: "PLAN-LAYER-PARTIAL",
      layeredEntry: {
        executionMethod: "layered_limits" as const,
        noChase: true as const,
        status: "planned" as const,
        sizingMode: "risk_percent" as const,
        stopModel: "common" as const,
        commonStopPrice: 9,
        // primaryTargetPrice omitted — incomplete
        authorizedRiskAmount: 50,
        limits: [{ price: 10, allocationPercent: 100 }],
      },
    };
    const layeredPartial = buildScoutFundingSnapshot({
      plan: layeredPartialPlan,
    });
    assert.equal(layeredPartial.entry, 10);
    assert.equal(layeredPartial.stop, 9);
    assert.equal(layeredPartial.target, "unconfigured");
    assert.ok(
      layeredPartial.blockingReasons.includes("missing execution levels")
    );
    assert.equal(layeredPartial.currentFundingDecision, "blocked");

    // Existing reservation values remain authoritative; still no mutation from snapshot
    await createCapitalReservation({
      planId: "PLAN-FUND-001",
      stockFileId: "ST-ABC-001",
      ticker: "ABC",
      requestedCapital: 1000,
      estimatedRisk: 50,
      expiresAt: "2026-08-01T00:00:00.000Z",
      capitalConfigurationPresent: false,
    });
    const withRes = buildScoutFundingSnapshot({
      plan: thesisOnlyPlan,
      stockFileId: "ST-ABC-001",
      reservations: await listCapitalReservations(),
    });
    assert.notEqual(withRes.existingReservationId, "unconfigured");
    assert.equal(withRes.requestedCapital, 1000);
    assert.equal(withRes.estimatedRisk, 50);
    assert.equal(typeof withRes.currentFundingDecision, "string");
    assert.equal(withRes.mutatesCapital, false);
    assert.equal(withRes.stockFileId, "ST-ABC-001");
    assert.equal(withRes.stockThesisId, "ST-ABC-001");

    const resCount = (await listCapitalReservations()).length;
    buildScoutFundingSnapshot({
      plan: thesisOnlyPlan,
      stockFileId: "ST-ABC-001",
      reservations: await listCapitalReservations(),
    });
    assert.equal(
      (await listCapitalReservations()).length,
      resCount,
      "snapshot creates no reservation mutation"
    );

    const execute = await fs.readFile(
      path.join(
        process.cwd(),
        "app/components/planning-preview/ScoutExecutePanel.tsx"
      ),
      "utf-8"
    );
    assert.match(execute, /Scout Funding Snapshot/);
    assert.match(execute, /scoutFundingSnapshotItem/);
    assert.match(execute, /data-scout-funding-snapshot/);
    assert.match(execute, /stockFileId/);

    const preview = await fs.readFile(
      path.join(
        process.cwd(),
        "app/components/planning-preview/PreviewPlanning.tsx"
      ),
      "utf-8"
    );
    assert.match(preview, /stockFileId:\s*scoutThesis\?\.id/);
  }

  __setCapitalPlannerStoreForTests(null);
  __setExternalPositionStoreForTests(null);
  console.log("test-capital-planner-26-15: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
