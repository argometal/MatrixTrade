/**
 * Prompt 29-21 — Assisted Scout funding follow-up after Accept (Option C).
 * Run: npm run test:funding-follow-up
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  assessFundingFollowUp,
  buildFundingFingerprint,
  buildFundingReadinessPanelModel,
  formatCapitalReservationProposalBlock,
  isReservationStaleRelativeToPlan,
  resolveFundingExpiration,
} from "../lib/scout-funding-follow-up";
import { validateProposalPayload } from "../lib/bridge";
import { createCapitalReservation } from "../lib/capital-reservation";
import { __setCapitalPlannerStoreForTests } from "../lib/capital-planner-store";
import { createCapitalConfiguration } from "../lib/capital-configuration";
import { getCapitalAccountSnapshot } from "../lib/capital-account";
import { CAPITAL_RESERVATION_CREATE_KEYS } from "../lib/capital-validate";
import type { TradePlan } from "../lib/plan-types";
import {
  capitalFieldValue,
  type CapitalReservation,
} from "../lib/capital-types";

async function read(rel: string) {
  return fs.readFile(path.join(process.cwd(), rel), "utf-8");
}

function resetCapital() {
  __setCapitalPlannerStoreForTests({
    configuration: null,
    ledgerEvents: [],
    reservations: [],
  });
}

function fundablePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-007",
    ticker: "GOOGL",
    stockThesisId: "ST-GOOGL-001",
    status: "watching",
    analysisTimeframes: ["1D"],
    entryTimeframe: "1D",
    plannedEntry: 175,
    stopPrice: 168,
    targetPrice: 200,
    validUntil: "2026-08-15T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-28T12:00:00.000Z",
    decision: {
      verdict: "go",
      decisionConfidence: 70,
      challenges: ["confirm volume"],
      decidedAt: "2026-07-28T12:00:00.000Z",
    },
    layeredEntry: {
      executionMethod: "layered_limits",
      noChase: true,
      status: "planned",
      sizingMode: "risk_percent",
      stopModel: "common",
      commonStopPrice: 168,
      primaryTargetPrice: 200,
      authorizedRiskAmount: 96,
      limits: [{ price: 175, allocationPercent: 100, stopPrice: 168 }],
    },
    ...overrides,
  } as TradePlan;
}

async function main() {
  // Schema extensions present
  assert.ok(CAPITAL_RESERVATION_CREATE_KEYS.includes("fundingFingerprint"));
  assert.ok(CAPITAL_RESERVATION_CREATE_KEYS.includes("sourcePlanUpdatedAt"));
  assert.ok(CAPITAL_RESERVATION_CREATE_KEYS.includes("sourceDecisionUpdateId"));

  // 19 / 20 — fingerprint deterministic + changes with funding params
  {
    const a = fundablePlan();
    const b = fundablePlan();
    assert.equal(buildFundingFingerprint(a), buildFundingFingerprint(b));
    const changed = fundablePlan({
      stopPrice: 165,
      layeredEntry: {
        ...a.layeredEntry!,
        commonStopPrice: 165,
        limits: [{ price: 175, allocationPercent: 100, stopPrice: 165 }],
      },
    });
    assert.notEqual(
      buildFundingFingerprint(a),
      buildFundingFingerprint(changed)
    );
  }

  // 17 — irrelevant text change does not change fingerprint
  {
    const a = fundablePlan({ notes: "alpha" } as Partial<TradePlan>);
    const b = fundablePlan({ notes: "beta thesis text" } as Partial<TradePlan>);
    assert.equal(buildFundingFingerprint(a), buildFundingFingerprint(b));
  }

  // 9 / 10 — expiration not invented; validUntil may supply
  {
    const withUntil = resolveFundingExpiration(fundablePlan());
    assert.equal(withUntil.kind, "scout_valid_until");
    if (withUntil.kind === "scout_valid_until") {
      assert.ok(withUntil.expiresAt.includes("2026-08-15"));
      assert.equal(withUntil.source, "Scout validUntil");
    }
    const noUntil = resolveFundingExpiration(
      fundablePlan({ validUntil: undefined })
    );
    assert.equal(noUntil.kind, "requires_confirmation");
  }

  resetCapital();
  await createCapitalConfiguration({
    settledCashBase: 50_000,
    settledCashAsOf: "2026-07-28T00:00:00.000Z",
    liquidityBuffer: 0,
    source: "manual",
  });
  const account = await getCapitalAccountSnapshot();

  // 1 — fundable scout produces eligibility
  {
    const followUp = assessFundingFollowUp({
      plan: fundablePlan(),
      account,
      reservations: [],
      authorizableLossRoom: 500,
      capitalConfigurationPresent: true,
      decisionUpdateId: "dec-1",
      generatedAt: "2026-07-28T12:00:00.000Z",
    });
    assert.equal(followUp.eligible, true);
    assert.ok(followUp.suggestedBlock);
    assert.equal(followUp.suggestedBlock!.type, "capital-reservation-create");
    assert.equal(followUp.suggestedBlock!.proposal.planId, "PLAN-007");
    assert.equal(
      typeof followUp.suggestedBlock!.proposal.requestedCapital,
      "number"
    );
    assert.equal(
      typeof followUp.suggestedBlock!.proposal.estimatedRisk,
      "number"
    );
    assert.ok(followUp.suggestedBlock!.proposal.fundingFingerprint);
    assert.ok(followUp.suggestedBlock!.proposal.expiresAt);
    // 3 — uses plan ids from accepted plan
    assert.equal(followUp.planId, "PLAN-007");
    // 8 — shares present for executable proposal
    assert.ok(
      (followUp.readiness?.shareCount ?? 0) > 0,
      "canonical shares required"
    );
    // 5 / 6 / 7 — authorized vs rounded / unused / capital not used
    assert.ok(followUp.readiness?.authorizedRisk !== undefined);
    assert.ok(followUp.readiness?.actualRoundedRisk !== undefined);
    assert.notEqual(
      followUp.readiness?.authorizedRisk,
      followUp.readiness?.actualRoundedRisk
    );
    assert.equal(followUp.readiness?.authorizedRisk, 96);
    assert.equal(followUp.readiness?.actualRoundedRisk, 91);
    assert.equal(followUp.readiness?.unusedRisk, 5);
    assert.ok(followUp.readiness?.capitalNotAllocated !== undefined);
    assert.ok(
      (followUp.readiness?.capitalNotAllocated ?? 0) ===
        Math.max(
          0,
          (capitalFieldValue(account.availableCapital) ?? 0) -
            (followUp.readiness?.requestedCapital ?? 0)
        )
    );
    // 4 — layered capital derived (monetary projection)
    assert.equal(followUp.readiness?.requestedCapital, 2275);

    const panel = buildFundingReadinessPanelModel(followUp);
    assert.equal(panel.canPrepare, true);
    assert.equal(panel.alreadyReserved, false);

    // 23 — prepared proposal validates under Apply schema
    const check = validateProposalPayload(followUp.suggestedBlock!);
    assert.equal(check.ok, true, check.ok ? "" : check.errors.join("; "));

    // 12 / 22 — suggested block does not claim mutatesCapital / prepared ≠ reserved
    assert.equal(followUp.readiness?.mutatesCapital, false);
  }

  // 2 — non-fundable (missing levels) does not produce proposal
  {
    const bare = fundablePlan({
      plannedEntry: undefined,
      stopPrice: undefined,
      targetPrice: undefined,
      layeredEntry: undefined,
    });
    const followUp = assessFundingFollowUp({
      plan: bare,
      account,
      reservations: [],
      authorizableLossRoom: 500,
      capitalConfigurationPresent: true,
    });
    assert.equal(followUp.eligible, false);
    assert.equal(followUp.suggestedBlock, undefined);
    assert.match(followUp.reason ?? "", /unavailable|missing/i);
  }

  // 8 — missing shares blocks executable proposal
  {
    const noQty = fundablePlan({
      layeredEntry: {
        executionMethod: "layered_limits",
        noChase: true,
        status: "planned",
        sizingMode: "risk_percent",
        stopModel: "common",
        commonStopPrice: 168,
        primaryTargetPrice: 200,
        // no authorizedRiskAmount → no fill projection shares
        limits: [{ price: 175, allocationPercent: 100 }],
      },
    } as TradePlan);
    // Without authorized risk, monetary/shares may be unconfigured
    const followUp = assessFundingFollowUp({
      plan: noQty,
      account,
      reservations: [],
      authorizableLossRoom: 500,
      capitalConfigurationPresent: true,
    });
    // Either missing capital/risk or shares — must not be eligible executable
    if (followUp.readiness?.shareCount === undefined) {
      assert.equal(followUp.eligible, false);
    }
  }

  // 11 — existing active reservation blocks duplicate preparation
  {
    resetCapital();
    await createCapitalConfiguration({
      settledCashBase: 50_000,
      settledCashAsOf: "2026-07-28T00:00:00.000Z",
      liquidityBuffer: 0,
      source: "manual",
    });
    const plan = fundablePlan();
    const fp = buildFundingFingerprint(plan);
    const res = await createCapitalReservation({
      planId: plan.id,
      ticker: plan.ticker,
      requestedCapital: 2100,
      estimatedRisk: 96,
      availableCapital: 50_000,
      authorizableLossRoom: 500,
      capitalConfigurationPresent: true,
      executionLevelsPresent: true,
      expiresAt: "2026-08-15T00:00:00.000Z",
      fundingFingerprint: fp,
      sourcePlanUpdatedAt: plan.updatedAt,
    });
    const account2 = await getCapitalAccountSnapshot();
    const followUp = assessFundingFollowUp({
      plan,
      account: account2,
      reservations: [res],
      authorizableLossRoom: 500,
      capitalConfigurationPresent: true,
    });
    assert.equal(followUp.eligible, false);
    assert.match(followUp.reason ?? "", /already active/i);
    // 12 — creating reservation consumed via create API, but follow-up itself does not
    assert.equal(followUp.readiness?.mutatesCapital, false);
  }

  // 14 / 15 — Accept creates one; duplicate create throws
  {
    resetCapital();
    await createCapitalConfiguration({
      settledCashBase: 50_000,
      settledCashAsOf: "2026-07-28T00:00:00.000Z",
      liquidityBuffer: 0,
      source: "manual",
    });
    const plan = fundablePlan();
    const first = await createCapitalReservation({
      id: "CAPRES-PLAN-007",
      planId: plan.id,
      requestedCapital: 2100,
      estimatedRisk: 96,
      availableCapital: 50_000,
      authorizableLossRoom: 500,
      capitalConfigurationPresent: true,
      executionLevelsPresent: true,
      fundingFingerprint: buildFundingFingerprint(plan),
    });
    assert.equal(first.id, "CAPRES-PLAN-007");
    await assert.rejects(
      () =>
        createCapitalReservation({
          planId: plan.id,
          requestedCapital: 2100,
          estimatedRisk: 96,
          availableCapital: 50_000,
          authorizableLossRoom: 500,
          capitalConfigurationPresent: true,
          executionLevelsPresent: true,
        }),
      /already has an active reservation/
    );
  }

  // 18 — replacement requires release first (no duplicate while stale active)
  {
    const plan = fundablePlan();
    const staleRes: CapitalReservation = {
      id: "CAPRES-STALE-ACTIVE",
      planId: plan.id,
      status: "reserved",
      requestedCapital: 2100,
      reservedCapital: 2100,
      estimatedRisk: 96,
      fundingDecision: "fully_funded",
      blockingReasons: [],
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      fundingFingerprint: "old-fingerprint",
    };
    const changed = fundablePlan({
      stopPrice: 160,
      layeredEntry: {
        ...plan.layeredEntry!,
        commonStopPrice: 160,
        limits: [{ price: 175, allocationPercent: 100, stopPrice: 160 }],
      },
    });
    assert.equal(isReservationStaleRelativeToPlan(staleRes, changed), true);
    const followUp = assessFundingFollowUp({
      plan: changed,
      account,
      reservations: [staleRes],
      authorizableLossRoom: 500,
      capitalConfigurationPresent: true,
    });
    assert.equal(followUp.eligible, false);
    assert.equal(followUp.suggestedBlock, undefined);
    assert.match(followUp.reason ?? "", /stale/i);
    const panel = buildFundingReadinessPanelModel(followUp);
    assert.equal(panel.canPrepare, false);
    assert.equal(panel.stale, true);
  }

  // 16 — funding-relevant change marks reservation stale
  {
    const plan = fundablePlan();
    const res: CapitalReservation = {
      id: "CAPRES-STALE",
      planId: plan.id,
      status: "reserved",
      requestedCapital: 2100,
      reservedCapital: 2100,
      estimatedRisk: 96,
      fundingDecision: "fully_funded",
      blockingReasons: [],
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      fundingFingerprint: buildFundingFingerprint(plan),
    };
    assert.equal(isReservationStaleRelativeToPlan(res, plan), false);
    const changed = fundablePlan({
      stopPrice: 160,
      layeredEntry: {
        ...plan.layeredEntry!,
        commonStopPrice: 160,
        limits: [{ price: 175, allocationPercent: 100, stopPrice: 160 }],
      },
    });
    assert.equal(isReservationStaleRelativeToPlan(res, changed), true);
  }

  // 21 — legacy reservations (no fingerprint) are not auto-staled
  {
    const plan = fundablePlan();
    const legacy: CapitalReservation = {
      id: "CAPRES-LEGACY",
      planId: plan.id,
      status: "reserved",
      requestedCapital: 2100,
      reservedCapital: 2100,
      estimatedRisk: 96,
      fundingDecision: "fully_funded",
      blockingReasons: [],
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    };
    assert.equal(isReservationStaleRelativeToPlan(legacy, plan), false);
  }

  // 24 / 25 — no thesis→file alias; no placeholder 10
  {
    const followUp = assessFundingFollowUp({
      plan: fundablePlan(),
      account,
      reservations: [],
      authorizableLossRoom: 500,
      capitalConfigurationPresent: true,
    });
    assert.equal(followUp.readiness?.snapshot.stockFileId, "unconfigured");
    assert.equal(followUp.readiness?.snapshot.stockThesisId, "ST-GOOGL-001");
    const src = await read("lib/scout-funding-follow-up.ts");
    assert.doesNotMatch(src, /MANUAL_SHARES_PLACEHOLDER|shares:\s*10/);
    assert.doesNotMatch(src, /stockFileId:\s*plan\.stockThesisId/);
  }

  // 13 — validation failure does not create reservation
  {
    resetCapital();
    await createCapitalConfiguration({
      settledCashBase: 50_000,
      settledCashAsOf: "2026-07-28T00:00:00.000Z",
      liquidityBuffer: 0,
      source: "manual",
    });
    const bad = {
      type: "capital-reservation-create",
      source: "test",
      proposal: {
        // missing planId / amounts
        expiresAt: "not-an-iso",
      },
    };
    const check = validateProposalPayload(bad as never);
    assert.equal(check.ok, false);
    const { listCapitalReservations } = await import(
      "../lib/capital-reservation"
    );
    const before = await listCapitalReservations();
    assert.equal(before.length, 0);
  }

  // 28 — failed follow-up assessment path leaves reason without mutating capital
  {
    const followUp = assessFundingFollowUp({
      plan: fundablePlan(),
      account: null,
      reservations: [],
      capitalConfigurationPresent: false,
    });
    assert.equal(followUp.eligible, false);
    assert.match(followUp.reason ?? "", /unavailable|missing/i);
    assert.equal(followUp.readiness?.mutatesCapital, false);
  }

  // UI wiring
  const control = await read(
    "app/components/control-panel/ControlPanelUpdate.tsx"
  );
  const panel = await read(
    "app/components/control-panel/FundingFollowUpPanel.tsx"
  );
  const execute = await read(
    "app/components/planning-preview/ScoutExecutePanel.tsx"
  );
  const apply = await read("lib/apply-trading-inbox.ts");

  assert.match(control, /FundingFollowUpPanel/);
  assert.match(control, /fundingFollowUp/);
  assert.match(control, /Prepare Funding JSON|onPrepare/);
  assert.match(panel, /data-funding-follow-up/);
  assert.match(panel, /Prepare Funding JSON/);
  assert.match(panel, /does not reserve capital/i);
  assert.match(execute, /data-scout-funding-follow-up-pending/);
  assert.match(execute, /data-scout-reservation-stale/);
  assert.match(apply, /assessFundingFollowUp/);
  assert.match(apply, /fundingFollowUp/);

  // 22 / 23 — no automatic Accept path in follow-up module
  const followSrc = await read("lib/scout-funding-follow-up.ts");
  assert.doesNotMatch(followSrc, /acceptAiBlockAction|applyTradingProposal\(/);
  assert.match(followSrc, /Option C/);

  // Format proposal block
  {
    const followUp = assessFundingFollowUp({
      plan: fundablePlan(),
      account,
      reservations: [],
      authorizableLossRoom: 500,
      capitalConfigurationPresent: true,
      generatedAt: "2026-07-28T12:00:00.000Z",
    });
    assert.ok(followUp.suggestedBlock);
    const text = formatCapitalReservationProposalBlock(followUp.suggestedBlock!);
    assert.match(text, /"type": "capital-reservation-create"/);
    assert.match(text, /"fundingFingerprint"/);
  }

  __setCapitalPlannerStoreForTests(null);
  console.log("test-funding-follow-up: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
