/**
 * Prompt 26-48 — Scout capital UI integration after rebase onto #109.
 * Run: npm run test:scout-capital-ui
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildScoutFundingSnapshot,
  SCOUT_FUNDING_SNAPSHOT_REQUIRED_KEYS,
} from "../lib/scout-funding-snapshot";
import { __setCapitalPlannerStoreForTests } from "../lib/capital-planner-store";
import type { TradePlan } from "../lib/plan-types";

async function read(rel: string) {
  return fs.readFile(path.join(process.cwd(), rel), "utf-8");
}

async function main() {
  const execute = await read(
    "app/components/planning-preview/ScoutExecutePanel.tsx"
  );
  const planning = await read(
    "app/components/planning-preview/PreviewPlanning.tsx"
  );
  const page = await read("app/(trading)/(preview)/planning/page.tsx");

  // Wiring from page → PreviewPlanning → ScoutExecutePanel
  assert.match(page, /reservations=\{reservations\}/);
  assert.match(page, /capitalAccount=\{capitalAccount\}/);
  assert.match(page, /capitalConfigurationPresent=\{capitalConfigurationPresent\}/);
  assert.match(planning, /reservations=\{reservations\}/);
  assert.match(planning, /capitalAccount=\{capitalAccount\}/);
  assert.match(planning, /capitalConfigurationPresent=\{capitalConfigurationPresent\}/);
  assert.match(execute, /reservations/);
  assert.match(execute, /capitalAccount/);
  assert.match(execute, /capitalConfigurationPresent/);

  // Visible funding summary + snapshot action
  assert.match(execute, /data-scout-funding-summary/);
  assert.match(execute, /data-scout-funding-snapshot/);
  assert.match(execute, /Scout Funding Snapshot/);
  assert.match(execute, /Capital required/);
  assert.match(execute, /Estimated risk/);
  assert.match(execute, /Available capital/);
  assert.match(execute, /Risk room/);
  assert.match(execute, /Funding status/);

  // No thesis→file alias at UI call sites
  assert.doesNotMatch(planning, /stockFileId:\s*scoutThesis\?\.id/);
  assert.doesNotMatch(planning, /stockFileId=\{scoutThesis\?\.id\}/);
  assert.doesNotMatch(execute, /stockFileId:\s*plan\.stockThesisId/);

  // Manual shares placeholder is not funding input
  assert.match(execute, /MANUAL_SHARES_PLACEHOLDER/);
  assert.doesNotMatch(
    execute,
    /buildScoutFundingSnapshot\([\s\S]*shares:\s*form\.shares/
  );

  // Snapshot ontology: thesis present, no file source → file unconfigured
  __setCapitalPlannerStoreForTests({
    configuration: null,
    ledgerEvents: [],
    reservations: [],
  });
  const plan = {
    id: "PLAN-CAP-UI-001",
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

  const snap = buildScoutFundingSnapshot({ plan });
  for (const key of SCOUT_FUNDING_SNAPSHOT_REQUIRED_KEYS) {
    assert.ok(key in snap, `missing ${key}`);
  }
  assert.equal(snap.stockThesisId, "ST-MSFT-001");
  assert.equal(snap.stockFileId, "unconfigured");
  assert.equal(snap.mutatesCapital, false);
  assert.equal(snap.readOnly, true);

  // Layered-only levels still resolve without plan-level prices (26-36 intact)
  const layeredOnly = buildScoutFundingSnapshot({
    plan: {
      ...plan,
      id: "PLAN-CAP-UI-LAYER",
      plannedEntry: undefined,
      stopPrice: undefined,
      targetPrice: undefined,
      layeredEntry: {
        executionMethod: "layered_limits",
        noChase: true,
        status: "planned",
        sizingMode: "risk_percent",
        stopModel: "common",
        commonStopPrice: 334,
        primaryTargetPrice: 450,
        authorizedRiskAmount: 96,
        limits: [{ price: 350, allocationPercent: 100 }],
      },
    } as TradePlan,
  });
  assert.equal(layeredOnly.entry, 350);
  assert.equal(layeredOnly.stop, 334);
  assert.equal(layeredOnly.target, 450);
  assert.ok(!layeredOnly.blockingReasons.includes("missing execution levels"));

  __setCapitalPlannerStoreForTests(null);
  console.log("test-scout-capital-ui: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
