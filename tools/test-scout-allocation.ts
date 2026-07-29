/**
 * Prompt 26-55 — Scout Allocation Board + relationship layer.
 * Run: npm run test:scout-allocation
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CapitalReservation } from "../lib/capital-types";
import { buildScoutAllocationCandidate } from "../lib/scout-allocation-candidates";
import { deriveScoutRelationships } from "../lib/scout-allocation-relationships";
import { simulateScoutAllocation } from "../lib/scout-allocation-simulate";
import {
  buildScoutAllocationSnapshotPackage,
  formatScoutAllocationSnapshotText,
} from "../lib/scout-allocation-snapshot";
import type { ScoutAllocationCandidate } from "../lib/scout-allocation-types";
import { canonicalShareCount } from "../lib/scout-funding-snapshot";
import type { TradePlan } from "../lib/plan-types";

async function read(rel: string) {
  return fs.readFile(path.join(process.cwd(), rel), "utf-8");
}

function cand(partial: Partial<ScoutAllocationCandidate> & {
  planId: string;
  ticker: string;
}): ScoutAllocationCandidate {
  return {
    requestedCapital: "unconfigured",
    estimatedRisk: "unconfigured",
    shareCount: "unconfigured",
    entry: "unconfigured",
    stop: "unconfigured",
    target: "unconfigured",
    scoutStatus: "watching",
    fundingDecision: "unassessed",
    blockingReasons: [],
    ...partial,
  };
}

function funded(
  planId: string,
  ticker: string,
  capital: number,
  risk: number
): ScoutAllocationCandidate {
  return cand({
    planId,
    ticker,
    requestedCapital: capital,
    estimatedRisk: risk,
    entry: 100,
    stop: 90,
    target: 130,
    shareCount: 10,
    fundingDecision: "fully_funded",
  });
}

function reservation(partial: Partial<CapitalReservation> & {
  id: string;
  planId: string;
}): CapitalReservation {
  return {
    status: "reserved",
    requestedCapital: 1000,
    reservedCapital: 1000,
    estimatedRisk: 50,
    fundingDecision: "fully_funded",
    blockingReasons: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

async function main() {
  // 1 — one Scout fits capital and risk
  {
    const a = funded("PLAN-A", "AAA", 1000, 50);
    const result = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [],
    });
    assert.equal(result.selected[0]?.afterDecision, "fully_funded");
    assert.equal(result.remainingCapital, 4000);
    assert.equal(result.remainingRiskRoom, 150);
    assert.equal(result.portfolioStatus, "fully_fundable");
  }

  // 2 — one exceeds capital
  {
    const a = funded("PLAN-A", "AAA", 6000, 50);
    const result = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [],
    });
    assert.equal(result.selected[0]?.afterDecision, "partially_funded");
    assert.ok((result.capitalDeficit ?? 0) > 0);
    assert.equal(result.thresholdCrossingPlanId, "PLAN-A");
  }

  // 3 — one exceeds risk
  {
    const a = funded("PLAN-A", "AAA", 1000, 300);
    const result = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [],
    });
    assert.equal(result.selected[0]?.afterDecision, "unfunded");
    assert.ok((result.riskDeficit ?? 0) > 0);
  }

  // 4 — two Scouts compatible
  {
    const a = funded("PLAN-A", "AAA", 1000, 40);
    const b = funded("PLAN-B", "BBB", 1000, 40);
    const result = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a, b],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [],
    });
    const bImpact =
      result.affected.find((i) => i.planId === "PLAN-B") ??
      result.unaffected.find((i) => i.planId === "PLAN-B");
    assert.ok(bImpact);
    assert.equal(bImpact!.afterDecision, "fully_funded");
    assert.equal(bImpact!.relationship, "compatible");
  }

  // 5 — two Scouts compete (B fully → partial)
  {
    const a = funded("PLAN-A", "AAA", 3000, 50);
    const b = funded("PLAN-B", "BBB", 2500, 50);
    // After A: capital 2000 left — B needs 2500 → partial
    const result = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a, b],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [],
    });
    const bImpact = result.affected.find((i) => i.planId === "PLAN-B");
    assert.ok(bImpact);
    assert.equal(bImpact!.beforeDecision, "fully_funded");
    assert.equal(bImpact!.afterDecision, "partially_funded");
    assert.equal(bImpact!.relationship, "competing");
  }

  // 6 — two Scouts mutually exclusive
  {
    const a = funded("PLAN-A", "AAA", 5000, 50);
    const b = funded("PLAN-B", "BBB", 4000, 50);
    const result = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a, b],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [],
    });
    const bImpact = result.affected.find((i) => i.planId === "PLAN-B");
    assert.ok(bImpact);
    assert.equal(bImpact!.afterDecision, "unfunded");
    assert.equal(bImpact!.relationship, "mutually_exclusive");
  }

  // 7 — selected order changes threshold-crossing Scout
  {
    const a = funded("PLAN-A", "AAA", 3000, 50);
    const b = funded("PLAN-B", "BBB", 3000, 50);
    const firstA = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a, b],
      selectedPlanIds: ["PLAN-A", "PLAN-B"],
      selectionOrder: ["PLAN-A", "PLAN-B"],
      existingReservations: [],
    });
    const firstB = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a, b],
      selectedPlanIds: ["PLAN-A", "PLAN-B"],
      selectionOrder: ["PLAN-B", "PLAN-A"],
      existingReservations: [],
    });
    assert.equal(firstA.thresholdCrossingPlanId, "PLAN-B");
    assert.equal(firstB.thresholdCrossingPlanId, "PLAN-A");
  }

  // 8 / 9 — covered by 5 and 6 (fully → partial / fully → unfunded)

  // 10 / 11 — active reservation counted once; own not double-counted
  {
    const a = funded("PLAN-A", "AAA", 2000, 80);
    a.existingReservationId = "RES-A";
    a.reservationStatus = "reserved";
    const res = reservation({
      id: "RES-A",
      planId: "PLAN-A",
      reservedCapital: 2000,
      estimatedRisk: 80,
    });
    // Available already net of reservation in account model:
    const result = simulateScoutAllocation({
      availableCapital: 3000,
      availableRiskRoom: 120,
      candidates: [a],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [res],
    });
    assert.equal(result.selected[0]?.relationship, "already_reserved");
    assert.equal(result.remainingCapital, 3000);
    assert.equal(result.remainingRiskRoom, 120);
    assert.equal(result.selectedCapital, 0); // newSelectedCapital excludes own active reservation
    assert.equal(result.alreadyReservedCapital, 2000);
    assert.equal(result.newSelectedCapital, 0);
    assert.equal(result.totalSelectedExposure, 2000);
    assert.equal(result.alreadyReservedRisk, 80);
    assert.equal(result.newSelectedRisk, 0);
    assert.equal(result.totalSelectedRiskExposure, 80);
  }

  // 12 — released reservation ignored
  {
    const a = funded("PLAN-A", "AAA", 1000, 40);
    const res = reservation({
      id: "RES-REL",
      planId: "PLAN-A",
      status: "released",
    });
    const result = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [res],
    });
    assert.notEqual(result.selected[0]?.relationship, "already_reserved");
    assert.equal(result.alreadyReservedCapital, 0);
    assert.equal(result.newSelectedCapital, 1000);
    assert.equal(result.totalSelectedExposure, 1000);
    assert.equal(result.alreadyReservedRisk, 0);
    assert.equal(result.newSelectedRisk, 40);
    assert.equal(result.totalSelectedRiskExposure, 40);
    assert.equal(result.remainingCapital, 4000);
  }

  // 13 — expired reservation ignored
  {
    const a = funded("PLAN-A", "AAA", 1000, 40);
    const res = reservation({
      id: "RES-EXP",
      planId: "PLAN-A",
      status: "expired",
    });
    const result = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [res],
    });
    assert.equal(result.remainingCapital, 4000);
    assert.equal(result.alreadyReservedCapital, 0);
    assert.equal(result.newSelectedCapital, 1000);
    assert.equal(result.totalSelectedExposure, 1000);
    assert.equal(result.alreadyReservedRisk, 0);
    assert.equal(result.newSelectedRisk, 40);
    assert.equal(result.totalSelectedRiskExposure, 40);
  }

  // 14 — blocked Scout remains blocked independently
  {
    const a = cand({
      planId: "PLAN-X",
      ticker: "XXX",
      requestedCapital: 500,
      estimatedRisk: 20,
      fundingDecision: "blocked",
      blockingReasons: ["missing execution levels"],
      scoutStatus: "watching",
    });
    const result = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: 200,
      candidates: [a],
      selectedPlanIds: ["PLAN-X"],
      selectionOrder: ["PLAN-X"],
      existingReservations: [],
    });
    assert.equal(result.selected[0]?.afterDecision, "blocked");
    assert.equal(result.selected[0]?.relationship, "blocked_independently");
  }

  // 15 — missing capital → unassessed
  {
    const a = funded("PLAN-A", "AAA", 1000, 40);
    const result = simulateScoutAllocation({
      availableCapital: undefined,
      availableRiskRoom: 200,
      candidates: [a],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [],
    });
    assert.equal(result.selected[0]?.afterDecision, "unassessed");
    assert.equal(result.portfolioStatus, "unassessed");
  }

  // 16 — missing risk → unassessed
  {
    const a = funded("PLAN-A", "AAA", 1000, 40);
    const result = simulateScoutAllocation({
      availableCapital: 5000,
      availableRiskRoom: undefined,
      candidates: [a],
      selectedPlanIds: ["PLAN-A"],
      selectionOrder: ["PLAN-A"],
      existingReservations: [],
    });
    assert.equal(result.selected[0]?.afterDecision, "unassessed");
  }

  // 17 — pairwise considers both capital and risk
  {
    const a = funded("PLAN-A", "AAA", 1000, 120);
    const b = funded("PLAN-B", "BBB", 1000, 120);
    // Capital enough for both (5000) but risk room 200 → mutually exclusive on risk
    const pairs = deriveScoutRelationships({
      focusPlanId: "PLAN-A",
      candidates: [a, b],
      availableCapital: 5000,
      availableRiskRoom: 200,
      existingReservations: [],
    });
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0]?.relationship, "mutually_exclusive");
  }

  // 18 — order-sensitive pair (selected first swaps who is fully funded)
  {
    const a = funded("PLAN-A", "AAA", 1000, 50);
    const b = funded("PLAN-B", "BBB", 1000, 50);
    const pairs = deriveScoutRelationships({
      focusPlanId: "PLAN-A",
      candidates: [a, b],
      availableCapital: 1500,
      availableRiskRoom: 200,
      existingReservations: [],
    });
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0]?.relationship, "order_sensitive");
    assert.equal(pairs[0]?.focusThenOther.focusDecision, "fully_funded");
    assert.equal(pairs[0]?.focusThenOther.otherDecision, "partially_funded");
    assert.equal(pairs[0]?.otherThenFocus.otherDecision, "fully_funded");
    assert.equal(pairs[0]?.otherThenFocus.focusDecision, "partially_funded");
  }

  // Snapshot read-only / no invent zeros
  {
    const result = simulateScoutAllocation({
      availableCapital: undefined,
      availableRiskRoom: undefined,
      candidates: [funded("PLAN-A", "AAA", 1000, 40)],
      selectedPlanIds: [],
      selectionOrder: [],
      existingReservations: [],
    });
    const pkg = buildScoutAllocationSnapshotPackage({
      result,
      selectedPlanIds: [],
      selectionOrder: [],
      existingReservationIds: [],
      generatedAt: "2026-07-28T00:00:00.000Z",
    });
    assert.equal(pkg.type, "scout-allocation-simulation");
    assert.equal(pkg.readOnly, true);
    assert.equal(pkg.mutatesCapital, false);
    assert.equal(pkg.startingCapital, null);
    assert.equal(pkg.startingRiskRoom, null);
    assert.equal(pkg.selectedCapital, null);
    assert.equal(pkg.alreadyReservedCapital, null);
    assert.equal(pkg.newSelectedCapital, null);
    assert.equal(pkg.totalSelectedExposure, null);
    assert.equal(pkg.alreadyReservedRisk, null);
    assert.equal(pkg.newSelectedRisk, null);
    assert.equal(pkg.totalSelectedRiskExposure, null);
    const text = formatScoutAllocationSnapshotText(pkg);
    assert.match(text, /"readOnly": true/);
    assert.match(text, /"mutatesCapital": false/);
    assert.doesNotMatch(text, /"startingCapital": 0/);
    assert.doesNotMatch(text, /\"alreadyReservedCapital\": 0/);
  }

  // Candidate builder: no stockFileId from thesis; shares from snapshot only
  {
    const plan = {
      id: "PLAN-CAND-1",
      ticker: "MSFT",
      stockThesisId: "ST-MSFT-001",
      status: "watching",
      analysisTimeframes: ["1D"],
      entryTimeframe: "1D",
      plannedEntry: 350,
      stopPrice: 334,
      targetPrice: 450,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    } as TradePlan;
    const candidate = buildScoutAllocationCandidate({ plan });
    assert.equal(candidate.stockThesisId, "ST-MSFT-001");
    assert.equal(candidate.shareCount, "unconfigured");
    assert.equal(canonicalShareCount(candidate.shareCount), undefined);
  }

  // UI surfaces
  const planning = await read(
    "app/components/planning-preview/PreviewPlanning.tsx"
  );
  const impact = await read(
    "app/components/planning-preview/ScoutAllocationImpact.tsx"
  );
  const strip = await read(
    "app/components/planning-preview/ScoutAllocationStrip.tsx"
  );
  const compare = await read(
    "app/components/planning-preview/ActiveScoutsComparisonTable.tsx"
  );
  const board = await read(
    "app/components/planning-preview/ScoutAllocationBoard.tsx"
  );
  const boardPage = await read(
    "app/(trading)/(preview)/planning/capital/allocation/page.tsx"
  );
  const prepareNote = await read(
    "app/components/planning-preview/ScoutPrepareAllocationNote.tsx"
  );
  const execute = await read(
    "app/components/planning-preview/ScoutExecutePanel.tsx"
  );
  const provider = await read(
    "app/components/planning-preview/ScoutAllocationProvider.tsx"
  );
  const simulateSrc = await read("lib/scout-allocation-simulate.ts");

  // 18 — Scout card displays relationship
  assert.match(impact, /Impacto de asignación|Allocation impact/);
  assert.match(impact, /Relationship|Relación|Sensible al orden|Order sensitive/);
  assert.match(impact, /data-scout-allocation-impact/);
  assert.match(planning, /ScoutAllocationImpact/);

  // 19 / 20 — Add / Remove
  assert.match(impact, /Agregar a la asignación|Add to allocation/);
  assert.match(impact, /Quitar de la asignación|Remove from allocation/);
  assert.match(provider, /const add = useCallback/);
  assert.match(provider, /const remove = useCallback/);

  // 21 — Move up/down
  assert.match(provider, /direction: \"up\" \| \"down\"/);
  assert.match(compare, /Move up/);
  assert.match(compare, /Move down/);
  assert.match(board, /Move up/);

  // 22 — Compare before/after funding
  assert.match(compare, /Funding now/);
  assert.match(compare, /After/);
  assert.match(compare, /data-scout-compare-allocation/);

  // 23 — Allocation strip
  assert.match(strip, /data-scout-allocation-strip/);
  assert.match(strip, /Capital left/);
  assert.match(strip, /Risk left/);
  assert.match(planning, /ScoutAllocationStrip/);

  // focused UI exposes order_sensitive directional preview
  assert.match(impact, /selecciona primero|selected first/i);

  // 24 — Board groups relationships
  assert.match(board, /Relationship groups/);
  assert.match(board, /data-allocation-group/);
  assert.match(board, /Compatible|competing|mutually_exclusive|Order sensitive/);
  assert.match(boardPage, /ScoutAllocationProvider/);

  // 25 — Allocation Snapshot read-only
  assert.match(board, /Copy Allocation Snapshot/);
  assert.match(board, /buildScoutAllocationSnapshotPackage/);

  // 26 — no persistence
  assert.doesNotMatch(provider, /localStorage|sessionStorage/);
  assert.match(provider, /Does not persist across reloads/);

  // 27 — canonical-share restriction intact
  assert.match(planning, /canonicalShareCount/);
  assert.match(prepareNote, /Allocation selected · share count still unconfigured/);
  assert.match(prepareNote, /Share count unconfigured — calculate allocation first/);
  assert.match(execute, /canonicalShareCount/);
  assert.match(execute, /MANUAL_SHARES_PLACEHOLDER/);

  // 28 — no placeholder 10 in allocation calculations
  assert.doesNotMatch(simulateSrc, /shares:\s*10|MANUAL_SHARES_PLACEHOLDER/);
  assert.doesNotMatch(
    await read("lib/scout-allocation-candidates.ts"),
    /MANUAL_SHARES_PLACEHOLDER|shares:\s*10/
  );

  // 29 — Stock Thesis ID never used as Stock File ID
  assert.match(
    await read("lib/scout-allocation-candidates.ts"),
    /stockFileId omitted|never infer/
  );
  assert.doesNotMatch(planning, /stockFileId:\s*scoutThesis\?\.id/);
  assert.doesNotMatch(boardPage, /stockFileId:\s*.*stockThesisId/);

  // 30 — mobile safe-area remains
  assert.match(
    planning,
    /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/
  );
  assert.match(
    board,
    /pb-\[calc\(4rem\+env\(safe-area-inset-bottom\)\)\]/
  );

  // Route exists
  assert.match(boardPage, /getCapitalAccountSnapshot/);
  assert.match(boardPage, /listCapitalReservations/);

  console.log("test-scout-allocation: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
