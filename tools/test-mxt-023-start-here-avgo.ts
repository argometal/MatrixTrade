/**
 * MXT Control — Start Here AVGO acceptance (routing contract).
 * Chat new → only Start Here pasted → "quiero crear AVGO" must route without FAIL conditions.
 * Run: npx tsx tools/test-mxt-023-start-here-avgo.ts
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

// UI: home shows exactly the four primary labels as PRIMARY entries
const primaryBlock = panelSrc.match(/const PRIMARY[\s\S]*?\n\];/)?.[0] ?? "";
assert.ok(primaryBlock.length > 0, "PRIMARY block found");
assert.ok(primaryBlock.includes('label: "Start Here"'));
assert.ok(primaryBlock.includes('label: "Stock Files"'));
assert.ok(primaryBlock.includes('label: "Library"'));
assert.ok(primaryBlock.includes('label: "Apply"'));
assert.equal(
  (primaryBlock.match(/label:\s*"/g) ?? []).length,
  4,
  "PRIMARY must declare exactly 4 buttons"
);
assert.ok(!primaryBlock.includes("MTA Mechanics"), "Mechanics must not be a home primary");

// Start Here must teach real routes only
assert.match(start, /Start Here · Stock Files · Library · Apply|EXACTLY 4 PRIMARY/i);
assert.match(start, /Control → Stock Files/);
assert.match(start, /Library → Technical Analysis → copy row 'MTAE protocol'/);
assert.match(start, /Library → Mechanics → copy row 'MTA Mechanics'/);
assert.match(start, /Control → Apply → copy row 'Apply schema contract'/);
assert.doesNotMatch(start, /Correct: Control → MTAE/);
assert.match(start, /FORBIDDEN invented routes:[\s\S]*Control → MTAE/);
assert.doesNotMatch(start, /Correct: Control → MTA Mechanics/);
assert.match(start, /Correct: Control → Library → Mechanics → copy row 'MTA Mechanics'/);

// AVGO new-ticker path without requiring Mechanics first
assert.match(start, /NEW TICKER|quiero crear AVGO/i);
assert.match(start, /Do NOT invent IDs|do not invent ST-\*/i);
assert.match(start, /Do NOT require full MTA Mechanics to begin/i);
assert.match(start, /ONE next action|exactly ONE next action/i);
assert.match(start, /TARGET → tactical STOP → R/i);
assert.match(start, /progressive technical evidence|ONLY the next chart/i);

// Simulated first NEXT ACTION for "quiero crear AVGO"
const firstNext =
  "NEXT ACTION:\nControl → Stock Files → search AVGO\nWHY:\nConfirm whether a Stock File already exists before creating.";
assert.match(firstNext, /Stock Files/);
assert.doesNotMatch(firstNext, /Mechanics|MTAE|Apply schema/i);

// Allowlist includes Start Here; does not invent Control→MTAE
assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("Start Here"));
assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("MTAE protocol"));
assert.ok(menu.includes("Control → Library → Technical Analysis"));
assert.ok(!menu.includes("Control → MTAE —"));

console.log("test-mxt-023-start-here-avgo: ok");
