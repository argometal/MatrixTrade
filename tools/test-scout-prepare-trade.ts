/**
 * Prompt 26-50 / 29-48 — Prepare trade requires canonical shares (not placeholder 10).
 * Run: npm run test:scout-prepare-trade
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildScoutFundingSnapshot,
  canonicalShareCount,
  formatScoutFundingSnapshotText,
} from "../lib/scout-funding-snapshot";
import { buildTradeProposalBlock } from "../lib/build-trade-proposal-block";
import type { TradePlan } from "../lib/plan-types";

async function read(rel: string) {
  return fs.readFile(path.join(process.cwd(), rel), "utf-8");
}

function basePlan(overrides: Partial<TradePlan> = {}): TradePlan {
  return {
    id: "PLAN-PREP-001",
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
    ...overrides,
  } as TradePlan;
}

function allocatedPlan(): TradePlan {
  return basePlan({
    layeredEntry: {
      executionMethod: "layered_limits",
      noChase: true,
      status: "planned",
      sizingMode: "risk_percent",
      stopModel: "common",
      commonStopPrice: 334,
      primaryTargetPrice: 450,
      authorizedRiskAmount: 96,
      limits: [{ price: 350, allocationPercent: 100, stopPrice: 334 }],
    },
  } as TradePlan);
}

async function main() {
  const planning = await read(
    "app/components/planning-preview/PreviewPlanning.tsx"
  );
  const watching = await read(
    "app/components/planning-preview/ScoutWatchingScan.tsx"
  );
  const fundingMenu = await read(
    "app/components/planning-preview/ScoutFundingExecutionMenu.tsx"
  );
  const prepareNote = await read(
    "app/components/planning-preview/ScoutPrepareAllocationNote.tsx"
  );
  const execute = await read(
    "app/components/planning-preview/ScoutExecutePanel.tsx"
  );
  const fundingLib = await read("lib/scout-funding-snapshot.ts");

  // 1 — Execute Prepare trade must not hard-code shares: 10 (16-08 moved off Watching)
  assert.doesNotMatch(execute, /shares:\s*10/);
  assert.match(execute, /canonicalShareCount/);
  assert.match(execute, /buildScoutFundingSnapshot/);
  assert.match(fundingMenu, /data-scout-prepare-trade/);
  assert.match(execute, /Prepare trade · allocation required/);
  assert.match(
    prepareNote,
    /Share count unconfigured — calculate allocation first/
  );
  assert.match(fundingMenu, /Canonical share count is required/);

  assert.match(execute, /capitalConfigurationPresent/);
  assert.doesNotMatch(execute, /stockFileId:\s*plan\.stockThesisId/);
  assert.doesNotMatch(planning, /stockFileId:\s*scoutThesis\?\.id/);

  // Watching scan metrics (Open Scout language); funding not on Watching
  assert.match(watching, /"Zone"/);
  assert.match(watching, /"Entry"/);
  assert.match(watching, /"Stop"/);
  assert.match(watching, /"Target"/);
  assert.match(watching, /"R"/);
  assert.match(watching, /"Wait horizon"/);
  assert.doesNotMatch(watching, /"Room"/);
  assert.doesNotMatch(watching, /Prepare trade/);
  assert.doesNotMatch(planning, /\["Capital required"/);
  assert.doesNotMatch(planning, /\["Estimated risk"/);
  assert.doesNotMatch(planning, /\["Funding status"/);
  assert.match(fundingMenu, /data-scout-case-funding-snapshot/);
  assert.match(fundingMenu, /href="\/planning\/capital"/);

  // 2 / 3 / 4 — Helper + snapshot behavior
  assert.match(fundingLib, /export function canonicalShareCount/);
  assert.equal(canonicalShareCount("unconfigured"), undefined);
  assert.equal(canonicalShareCount("unknown"), undefined);
  assert.equal(canonicalShareCount(0), undefined);
  assert.equal(canonicalShareCount(-1), undefined);
  assert.equal(canonicalShareCount(Number.NaN), undefined);
  assert.equal(canonicalShareCount(6), 6);

  const bare = buildScoutFundingSnapshot({ plan: basePlan() });
  assert.equal(bare.shareCount, "unconfigured");
  assert.equal(canonicalShareCount(bare.shareCount), undefined);
  // No inference from ticker / entry / capital alone
  assert.equal(bare.requestedCapital, "unconfigured");
  assert.equal(bare.stockFileId, "unconfigured");
  assert.equal(bare.stockThesisId, "ST-MSFT-001");

  const allocated = buildScoutFundingSnapshot({ plan: allocatedPlan() });
  const shares = canonicalShareCount(allocated.shareCount);
  assert.equal(shares, 6);
  assert.equal(allocated.shareCount, 6);
  assert.equal(allocated.requestedCapital, 2100);
  assert.equal(allocated.estimatedRisk, 96);

  // When canonical shares exist → proposal uses exact count (not 10)
  const proposal = buildTradeProposalBlock({
    id: "T-PREP-001",
    ticker: "MSFT",
    entry: 350,
    stop: 334,
    target: 450,
    shares: shares!,
    playbookId: "pb",
    direction: "long",
  });
  assert.match(proposal, /"shares": 6/);
  assert.doesNotMatch(proposal, /"shares": 10/);

  // 5 — Manual placeholder 10 remains form-only; primary prepare is on Execute (16-08)
  assert.match(execute, /MANUAL_SHARES_PLACEHOLDER\s*=\s*"10"/);
  assert.match(execute, /never authoritative for funding|not funding data/i);
  assert.match(execute, /handleCopyManualProposal/);
  assert.doesNotMatch(execute, /handlePrepareTradeCanonical/);
  assert.match(fundingMenu, /data-scout-prepare-trade/);
  assert.match(execute, /canonicalShareCount\(/);
  assert.match(execute, /buildTradeProposalBlock/);
  assert.doesNotMatch(
    execute,
    /buildScoutFundingSnapshot\([\s\S]*shares:\s*form\.shares/
  );
  assert.match(prepareNote, /data-scout-prepare-allocation-msg/);
  assert.match(execute, /Prepare trade · allocation required/);
  assert.match(execute, /ScoutFundingExecutionMenu/);
  assert.match(fundingMenu, /data-scout-funding-execution-menu/);
  assert.match(execute, /Manual levels → JSON/);
  assert.match(execute, /Copy trade-proposal JSON/);
  assert.match(execute, /row\.label !== \"Shares\"/);

  // 7 — Funding Snapshot remains read-only
  assert.equal(allocated.mutatesCapital, false);
  assert.equal(allocated.readOnly, true);
  const text = formatScoutFundingSnapshotText(allocated);
  assert.match(text, /Read-only/);
  assert.match(text, /mutatesCapital: false/);
  assert.match(text, /shareCount: 6/);

  // 8 — Thesis ID is not Stock File ID
  assert.notEqual(allocated.stockThesisId, allocated.stockFileId);
  assert.equal(allocated.stockFileId, "unconfigured");

  // 9 — Visual declutter markers remain
  assert.match(watching, /data-scout-case-summary/);
  assert.doesNotMatch(watching, /data-scout-case-details/);
  assert.match(execute, /data-scout-funding-summary/);
  assert.match(execute, /data-scout-tech-menu/);

  console.log("test-scout-prepare-trade: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
