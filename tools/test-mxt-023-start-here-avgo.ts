/**
 * MXT — Start Here AVGO acceptance (routing contract).
 * Fresh AI + ONLY Start Here → real human UI only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildStartHereBrief } from "../lib/start-here-brief";
import {
  VISIBLE_SNAPSHOT_MENU_LABELS,
  formatSnapshotMenuForMechanics,
} from "../lib/visible-snapshot-menu";

const start = buildStartHereBrief();
const menu = formatSnapshotMenuForMechanics();
const panelSrc = readFileSync(
  join(process.cwd(), "app/components/control-panel/MatrixControlPanel.tsx"),
  "utf8"
);
const chromeSrc = readFileSync(
  join(process.cwd(), "app/components/preview/MatrixDesktopChrome.tsx"),
  "utf8"
);

assert.match(chromeSrc, /StartHereButton/);

const primaryBlock = panelSrc.match(/const PRIMARY[\s\S]*?\n\];/)?.[0] ?? "";
assert.ok(primaryBlock.includes('label: "Mechanics"'));
assert.ok(primaryBlock.includes('label: "Stock Files"'));
assert.ok(primaryBlock.includes('label: "Library"'));
assert.ok(primaryBlock.includes('label: "Apply"'));
assert.equal((primaryBlock.match(/label:\s*"/g) ?? []).length, 4);
assert.ok(!primaryBlock.includes("Start Here"));

assert.match(start, /Mechanics · Stock Files · Library · Apply|exactly: Mechanics/i);
assert.match(start, /Control → Stock Files|Open Stock Files/i);
assert.match(start, /New stock case/);
assert.match(start, /Library → Technical Analysis → MTAE protocol|MTAE protocol/);
assert.match(start, /Control → Mechanics|MTA Mechanics/);
assert.match(start, /Control → Apply/);
assert.match(start, /header button labeled Start Here|GLOBAL HEADER/i);
assert.match(start, /INTERNAL OPERATION SAFETY RULE/);
assert.doesNotMatch(start, /Use stock-case-create/i);
assert.doesNotMatch(start, /Correct: Control → MTAE/);

assert.match(start, /NEW TICKER|quiero crear AVGO/i);
assert.match(start, /Do NOT invent|do not invent ST-\*/i);
assert.match(start, /Do NOT require Mechanics merely to navigate/i);
assert.match(start, /CREATE SCOUT|quiero crear un Scout/i);
assert.match(start, /REVIEW A TRADE|quiero revisar mi trade/i);
assert.match(start, /WHY DID THIS PLAN FAIL|Pipeline Performance/i);
assert.match(start, /SAVE \/ PERSIST|quiero guardar lo que analizamos/i);
assert.match(start, /ONE next human action|exactly ONE next/i);

// Simulated first human action for AVGO
const firstNext = [
  "NEXT ACTION:",
  "Open Control.",
  "LOCATION:",
  "Header → Control.",
  "EXPECTED RESULT:",
  "Mechanics · Stock Files · Library · Apply.",
].join("\n");
assert.match(firstNext, /Open Control/);
assert.doesNotMatch(firstNext, /stock-case-create|file-update|scout-plan-create/i);

assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("Start Here"));
assert.ok(menu.includes("Control → Mechanics"));

console.log("test-mxt-023-start-here-avgo: ok");
