/**
 * Prompt 26-41 — Scout desk declutter (decision + numbers first).
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
  const execute = await read(
    "app/components/planning-preview/ScoutExecutePanel.tsx"
  );
  const help = await read("app/components/preview/PageHelpPanel.tsx");
  const badge = await read("app/components/preview/UiWindowIdBadge.tsx");
  const page = await read("app/(trading)/(preview)/planning/page.tsx");
  const pageHelp = await read("lib/page-help.ts");

  // Header — short subtitle, no war-room essay
  assert.match(planning, /Active cases and execution readiness/);
  assert.doesNotMatch(planning, /War room — cases to watch/);
  assert.match(planning, /New stock case/);
  assert.match(planning, /Capital Planner/);
  // Desk snapshot removed from header chrome
  assert.doesNotMatch(
    planning,
    /header[\s\S]*SnapshotButton[\s\S]*<\/header>/
  );

  // Case summary — numbers first, long copy in Details
  assert.match(planning, /data-scout-case-summary/);
  assert.match(planning, /data-scout-case-details/);
  assert.match(planning, /"Zone"/);
  assert.match(planning, /"Entry"/);
  assert.match(planning, /"Stop"/);
  assert.match(planning, /"Target"/);
  assert.match(planning, /"Plan R:R"/);
  assert.match(planning, /"Room"/);
  assert.match(planning, /Open Scout/);
  assert.match(planning, /Prepare trade/);
  assert.match(planning, /Details/);
  assert.match(planning, /Invalidation/);
  assert.match(planning, /Fills in war room/);
  assert.match(planning, /Evidence/);

  // Execute — slim primary; technical secondary
  assert.match(execute, /data-scout-execute/);
  assert.match(execute, /Trade boot/);
  assert.match(execute, /Prepare trade/);
  assert.doesNotMatch(
    execute,
    /Copy boot → AI →[\s\S]*Control → Apply → Accept/
  );
  assert.doesNotMatch(execute, /Trades book →/);
  assert.match(execute, /data-scout-tech-menu/);
  assert.match(execute, /Manual levels → JSON/);
  assert.match(execute, /Technical actions/);
  // Example block only inside technical/manual path
  const exampleIdx = execute.indexOf("Example block");
  const techIdx = execute.indexOf("data-scout-tech-menu");
  assert.ok(exampleIdx > techIdx, "Example block must sit under technical menu");

  // Help — icon trigger on Scout page
  assert.match(page, /trigger="icon"/);
  assert.match(help, /trigger\?: \"rail\" \| \"icon\"/);
  assert.match(help, /data-page-help-trigger="icon"/);
  assert.match(pageHelp, /Active cases and execution readiness/);

  // UI badge hidden in production
  assert.match(badge, /isProductionUi/);
  assert.match(badge, /NODE_ENV === \"production\"/);

  // Bottom safe padding so mobile nav does not cover cards
  assert.match(
    planning,
    /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/
  );

  console.log("test-scout-ui-26-41: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
