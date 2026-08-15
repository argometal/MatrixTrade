/**
 * MTA contextual ? help (Argus-style) — doctrine off chrome.
 * Run: npx tsx tools/test-mta-help-declutter.ts
 */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

async function read(rel: string) {
  return fs.readFile(path.join(process.cwd(), rel), "utf-8");
}

async function main() {
  const topics = await read("lib/mta-help-topics.ts");
  const link = await read("app/components/preview/MtaHelpLink.tsx");
  const dashboard = await read("app/components/dashboard/PreviewDashboard.tsx");
  const planning = await read(
    "app/components/planning-preview/PreviewPlanning.tsx"
  );
  const outcome = await read(
    "app/components/planning-preview/PlanRecordOutcomePanel.tsx"
  );
  const capital = await read(
    "app/components/planning-preview/CapitalPlannerPanel.tsx"
  );
  const pageHelp = await read("lib/page-help.ts");

  assert.match(link, /data-mta-help-trigger/);
  assert.match(link, />\s*\?\s*</);
  assert.match(topics, /dashboard-attention/);
  assert.match(topics, /plan-record-outcome/);
  assert.match(topics, /CAPITAL_ALLOCATION_FLOW/);

  assert.match(dashboard, /MtaHelpLink/);
  assert.match(dashboard, /trigger="icon"/);
  assert.doesNotMatch(
    dashboard,
    /Copy for AI → diagnose → one Apply block/
  );
  assert.doesNotMatch(dashboard, /Detection surface only/);
  assert.doesNotMatch(dashboard, /Closed-trade experiment P\/L only/);

  assert.match(planning, /scout-learning-queue/);
  assert.doesNotMatch(planning, /Close the circuit before new Scouts/);

  assert.match(outcome, /plan-record-outcome/);
  assert.doesNotMatch(outcome, /Scout outcome ≠ account P\/L/);

  assert.match(capital, /MtaHelpLink/);
  assert.match(capital, /data-allocation-flow-help/);
  assert.doesNotMatch(capital, /Model A cash-ledger\. Settled cash/);

  assert.match(pageHelp, /panelLabel: \"Help\"/);

  console.log("test-mta-help-declutter: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
