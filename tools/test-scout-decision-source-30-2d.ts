/**
 * 30-2D — ScoutDecisionSource vs OA confirmedBy mapping.
 * Run: npm run test:scout-decision-source-30-2d
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mapOperationalConfirmedByToDecisionSource } from "../lib/scout-decision-types";
import { SCOUT_OPERATIONAL_STATUS_ACTIONS } from "../lib/scout-operational-state";

assert.equal(mapOperationalConfirmedByToDecisionSource("human"), "human");
assert.equal(mapOperationalConfirmedByToDecisionSource("ai"), "ai");
assert.equal(mapOperationalConfirmedByToDecisionSource("system"), "human");
assert.equal(mapOperationalConfirmedByToDecisionSource(undefined), "human");

assert.deepEqual(
  [...SCOUT_OPERATIONAL_STATUS_ACTIONS],
  ["Passed", "Review 1D", "Review 1W", "Reanalyze", "Unlikely", "Armed"]
);

const repair = readFileSync(
  join(__dirname, "../lib/scout-plan-repair.ts"),
  "utf8"
);
assert.match(repair, /mapOperationalConfirmedByToDecisionSource\(parsed\.confirmedBy\)/);
assert.doesNotMatch(repair, /decidedBy:\s*parsed\.confirmedBy\s*\?\?/);
assert.doesNotMatch(repair, /as ScoutDecisionSource/);
assert.doesNotMatch(repair, /as any/);
assert.doesNotMatch(repair, /@ts-ignore|@ts-expect-error/);

const planning = readFileSync(
  join(__dirname, "../app/components/planning-preview/PreviewPlanning.tsx"),
  "utf8"
);
assert.match(planning, /openPanel\(\{\s*step:\s*"apply",\s*applyJson:\s*json/);
assert.match(planning, /stashControlApplyDraft/);
assert.match(planning, /setOperationalClipboardOk\(copied\)/);
assert.match(planning, /data-scout-operational-copy-json/);
assert.match(planning, /Copy JSON/);
assert.match(planning, /JSON copied — Control → Apply opened/);
assert.match(planning, /Clipboard blocked/);

console.log("test-scout-decision-source-30-2d: ok");
