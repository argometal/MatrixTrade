/**
 * Prompt 26-41 / 26-48 / 29-47 / 29-48 — Scout desk declutter + funding menu.
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

  // 1 — Header short subtitle, no war-room essay
  assert.match(planning, /Active cases and execution readiness/);
  assert.doesNotMatch(planning, /War room — cases to watch/);
  assert.match(planning, /New stock case/);
  assert.match(planning, /Capital Planner/);
  assert.match(planning, /data-scout-header-actions/);
  assert.match(planning, /grid grid-cols-3/);
  assert.doesNotMatch(
    planning,
    /header[\s\S]*SnapshotButton[\s\S]*<\/header>/
  );

  // 2 / 3 — Case summary numbers first; Details collapsed; consolidated tag
  assert.match(planning, /data-scout-case-summary/);
  assert.match(planning, /data-scout-case-details/);
  assert.match(planning, /"Zone"/);
  assert.match(planning, /"Entry"/);
  assert.match(planning, /"Stop"/);
  assert.match(planning, /"Target"/);
  assert.match(planning, /"Plan R:R"/);
  assert.match(planning, /"Executable R"/);
  assert.match(planning, /"Wait Horizon"/);
  assert.match(planning, /"Room"/);
  assert.match(planning, /Open Scout/);
  assert.match(planning, /Prepare trade/);
  assert.match(planning, /Details/);
  assert.match(planning, /Invalidation/);
  assert.match(planning, /Fills in war room/);
  assert.match(planning, /Evidence/);
  assert.doesNotMatch(planning, /\["Decision"/);
  assert.doesNotMatch(planning, /\["Operational State"/);
  assert.doesNotMatch(planning, /\["Next Action"/);
  assert.doesNotMatch(planning, /\["Freshness"/);
  assert.doesNotMatch(planning, /\["Review"/);
  assert.doesNotMatch(planning, /\["Capital required"/);
  assert.doesNotMatch(planning, /\["Estimated risk"/);
  assert.doesNotMatch(planning, /\["Funding status"/);
  // 26-50 — no hard-coded shares in case-summary Prepare trade
  assert.doesNotMatch(planning, /shares:\s*10/);
  assert.match(planning, /canonicalShareCount/);
  assert.match(planning, /Prepare trade · allocation required/);
  assert.match(planning, /data-scout-operational-tag/);
  assert.match(planning, /formatConsolidatedOperationalTag/);

  // 4 / 5 — Funding & execution menu (single path); capital inputs still wired
  assert.match(planning, /ScoutFundingExecutionMenu/);
  assert.match(fundingMenu, /data-scout-funding-execution-menu/);
  assert.match(fundingMenu, /Funding &amp; execution/);
  assert.match(fundingMenu, /Scout Funding Snapshot/);
  assert.match(fundingMenu, /data-scout-funding-snapshot/);
  assert.match(fundingMenu, /Calculate allocation/);
  assert.match(fundingMenu, /Open Allocation Board/);
  assert.match(fundingMenu, /Open Capital Planner/);
  assert.match(fundingMenu, /data-scout-prepare-trade/);
  assert.match(planning, /scoutFundingSnapshotItem/);
  assert.match(planning, /buildScoutFundingSnapshot/);
  assert.match(execute, /buildScoutFundingSnapshot/);
  assert.match(execute, /reservations/);
  assert.match(execute, /capitalAccount/);
  assert.match(execute, /capitalConfigurationPresent/);
  assert.match(page, /listCapitalReservations/);
  assert.match(page, /getCapitalAccountSnapshot/);
  assert.match(planning, /reservations=\{reservations\}/);
  assert.match(planning, /capitalAccount=\{capitalAccount\}/);
  // Lower Execute no longer duplicates snapshot / prepare
  assert.doesNotMatch(execute, /Scout Funding Snapshot/);
  assert.doesNotMatch(execute, /data-scout-prepare-trade/);

  // 6 / 7 — stockFileId unconfigured; no thesis→file alias
  assert.doesNotMatch(planning, /stockFileId:\s*scoutThesis\?\.id/);
  assert.doesNotMatch(planning, /stockFileId=\{scoutThesis\?\.id\}/);
  assert.doesNotMatch(execute, /stockFileId:\s*plan\.stockThesisId/);
  assert.match(fundingSnap, /textOrUnconfigured\(input\.stockFileId\)/);
  assert.match(fundingSnap, /export function canonicalShareCount/);
  assert.match(
    planning,
    /stockFileId omitted — StockThesis has no authoritative Stock File ID|stockFileId omitted — no authoritative Stock File ID/
  );

  // 8 / 9 — Compact funding summary visible on Execute (read-only summary)
  assert.match(execute, /data-scout-funding-summary/);
  assert.match(execute, /Capital required/);
  assert.match(execute, /Estimated risk/);
  assert.match(execute, /Available capital/);
  assert.match(execute, /Risk room/);
  assert.match(execute, /Funding status/);
  assert.match(execute, /Unconfigured/);

  // 10 — Manual 10 shares placeholder does not drive funding
  assert.match(execute, /MANUAL_SHARES_PLACEHOLDER/);
  assert.match(execute, /never authoritative for funding|not funding data/i);
  assert.match(execute, /shares: MANUAL_SHARES_PLACEHOLDER/);
  // Primary levels omit Shares unless canonical shareCount exists
  assert.match(execute, /row\.label !== \"Shares\"/);

  // 11 / 12 — Example / Trades book off primary; technical menu present
  assert.match(execute, /data-scout-execute/);
  assert.match(execute, /Trade boot/);
  assert.match(fundingMenu, /prepareLabel/);
  assert.match(fundingMenu, /data-scout-prepare-trade/);
  assert.match(planning, /Prepare trade/);
  assert.doesNotMatch(
    execute,
    /Copy boot → AI →[\s\S]*Control → Apply → Accept/
  );
  assert.doesNotMatch(execute, /Trades book →/);
  assert.match(execute, /data-scout-tech-menu/);
  assert.match(execute, /Manual levels → JSON/);
  assert.match(execute, /Technical actions/);
  const exampleIdx = execute.indexOf("Example block");
  const techIdx = execute.indexOf("data-scout-tech-menu");
  assert.ok(exampleIdx > techIdx, "Example block must sit under technical menu");

  // 13 — Compact Help
  assert.match(page, /trigger="icon"/);
  assert.match(help, /trigger\?: \"rail\" \| \"icon\"/);
  assert.match(help, /data-page-help-trigger="icon"/);
  assert.match(
    help,
    /has-\[\[data-scout-map-focus=true\]\]:\[&_\[data-page-help-trigger=icon\]\]:max-lg:hidden/
  );
  assert.match(pageHelp, /Active cases and execution readiness/);

  // 14 — UI·scout hidden in production
  assert.match(badge, /isProductionUi/);
  assert.match(badge, /NODE_ENV === \"production\"/);

  // 15 — Mobile map focus collapses Scout chrome; layout owns bottom safe-area
  assert.match(planning, /data-scout-map-focus/);
  assert.match(planning, /hidden lg:flex lg:flex-1 lg:flex-col/);
  assert.doesNotMatch(
    planning,
    /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/
  );

  // 16 — Plan map Hide above page-help "?" on mobile
  assert.match(sidePanel, /z-40/);
  assert.match(sidePanel, /data-scout-plan-map-hide/);

  console.log("test-scout-ui-26-41: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
