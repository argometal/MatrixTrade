/**
 * Prompt 26-41 / 16-08 — Scout desk declutter + Watching scan / Execute funding.
 * Run: npx tsx tools/test-scout-ui-26-41.ts
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

async function read(rel: string) {
  return fs.readFile(path.join(process.cwd(), rel), "utf-8");
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
  const execute = await read(
    "app/components/planning-preview/ScoutExecutePanel.tsx"
  );
  const help = await read("app/components/preview/PageHelpPanel.tsx");
  const badge = await read("app/components/preview/UiWindowIdBadge.tsx");
  const page = await read("app/(trading)/(preview)/planning/page.tsx");
  const pageHelp = await read("lib/page-help.ts");
  const fundingSnap = await read("lib/scout-funding-snapshot.ts");
  const sidePanel = await read(
    "app/components/planning-preview/PlanLevelsSidePanel.tsx"
  );

  // 1 — Header short subtitle
  assert.match(planning, /Active plans and execution readiness/);
  assert.doesNotMatch(planning, /War room — cases to watch/);
  assert.match(planning, /New stock case/);
  assert.match(planning, /Capital Planner/);
  assert.match(planning, /data-scout-header-actions/);
  assert.match(planning, /grid grid-cols-3/);
  assert.doesNotMatch(
    planning,
    /header[\s\S]*SnapshotButton[\s\S]*<\/header>/
  );

  // 16-08 — Learning Queue removed from Desk (logic remains in plan-helpers / ATTN)
  assert.doesNotMatch(planning, /data-scout-learning-queue/);
  assert.doesNotMatch(planning, /Scout learning queue/);
  assert.doesNotMatch(planning, /needs outcome/);

  // Watching scan — Stock Profile link; no funding dump
  assert.match(planning, /ScoutWatchingScan/);
  assert.match(watching, /data-scout-case-summary/);
  assert.match(watching, /data-scout-watching-scan/);
  assert.match(watching, /\["Zone"/);
  assert.match(watching, /\["Entry"/);
  assert.match(watching, /\["Stop"/);
  assert.match(watching, /\["Target"/);
  assert.match(watching, /\["R"/);
  assert.match(watching, /\["Wait horizon"/);
  assert.match(watching, /View Stock Profile/);
  assert.match(watching, /data-scout-open-scout/);
  assert.match(watching, /formatScoutWatchTriggerLine/);
  assert.doesNotMatch(watching, /Room/);
  assert.doesNotMatch(watching, /Prepare trade/);
  assert.doesNotMatch(watching, /ScoutFundingExecutionMenu/);
  assert.doesNotMatch(watching, /ScoutAllocationImpact/);
  assert.doesNotMatch(watching, /data-scout-case-details/);
  assert.match(watching, /data-scout-operational-tag/);
  assert.match(watching, /formatConsolidatedOperationalTag/);

  // Funding & Prepare live on Execute (not Watching)
  assert.match(execute, /ScoutFundingExecutionMenu/);
  assert.match(fundingMenu, /data-scout-funding-execution-menu/);
  assert.match(fundingMenu, /Funding &amp; execution/);
  assert.match(fundingMenu, /Scout Funding Snapshot/);
  assert.match(fundingMenu, /data-scout-funding-snapshot/);
  assert.match(fundingMenu, /Calculate allocation/);
  assert.match(fundingMenu, /Open Allocation Board/);
  assert.match(fundingMenu, /Open Capital Planner/);
  assert.match(fundingMenu, /data-scout-prepare-trade/);
  assert.match(execute, /scoutFundingSnapshotItem/);
  assert.match(execute, /buildScoutFundingSnapshot/);
  assert.match(execute, /Prepare trade · allocation required/);
  assert.match(execute, /canonicalShareCount/);
  assert.doesNotMatch(execute, /shares:\s*10/);
  assert.match(page, /listCapitalReservations/);
  assert.match(page, /getCapitalAccountSnapshot/);
  assert.match(planning, /reservations=\{reservations\}/);
  assert.match(planning, /capitalAccount=\{capitalAccount\}/);

  // stockFileId unconfigured; no thesis→file alias
  assert.doesNotMatch(planning, /stockFileId:\s*scoutThesis\?\.id/);
  assert.doesNotMatch(planning, /stockFileId=\{scoutThesis\?\.id\}/);
  assert.doesNotMatch(execute, /stockFileId:\s*plan\.stockThesisId/);
  assert.match(fundingSnap, /textOrUnconfigured\(input\.stockFileId\)/);
  assert.match(fundingSnap, /export function canonicalShareCount/);

  // Compact funding summary visible on Execute
  assert.match(execute, /data-scout-funding-summary/);
  assert.match(execute, /Capital required/);
  assert.match(execute, /Estimated risk/);
  assert.match(execute, /Available capital/);
  assert.match(execute, /Risk room/);
  assert.match(execute, /Funding status/);
  assert.match(execute, /Unconfigured/);

  // Manual 10 shares placeholder does not drive funding
  assert.match(execute, /MANUAL_SHARES_PLACEHOLDER/);
  assert.doesNotMatch(
    execute,
    /buildScoutFundingSnapshot\([\s\S]*shares:\s*form\.shares/
  );

  // Plan map panel chrome
  assert.match(sidePanel, /data-scout-plan-map-panel/);
  assert.match(planning, /data-scout-map-focus/);
  assert.match(
    help,
    /has-\[\[data-scout-map-focus=true\]\]:\[&_\[data-page-help-trigger=icon\]\]:max-lg:hidden/
  );
  assert.match(badge, /UiWindowIdBadge|data-ui-window-id/);
  assert.match(pageHelp, /planning/);

  // No new war filters / ontology in Watching
  assert.doesNotMatch(watching, /isWarReadyScoutPlan/);
  assert.match(planning, /isWarReadyScoutPlan/);

  console.log("test-scout-ui-26-41: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
