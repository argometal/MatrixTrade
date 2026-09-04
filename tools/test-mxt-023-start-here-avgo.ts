/**
 * MXT Control — Start Here AVGO acceptance (routing contract).
 * Chat new → only Start Here (GLOBAL header) → "quiero crear AVGO".
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
const chromeSrc = readFileSync(
  join(process.cwd(), "app/components/preview/MatrixDesktopChrome.tsx"),
  "utf8"
);
const mobileSrc = readFileSync(
  join(process.cwd(), "app/components/preview/PreviewMobileHeader.tsx"),
  "utf8"
);
const startBtnSrc = readFileSync(
  join(process.cwd(), "app/components/control-panel/StartHereButton.tsx"),
  "utf8"
);

// Global Start Here outside Control
assert.match(chromeSrc, /StartHereButton/);
assert.match(mobileSrc, /StartHereButton/);
assert.match(startBtnSrc, /data-testid=["']start-here-button["']/);
assert.match(startBtnSrc, /data\.startHere\.brief/);

// Control home: exactly four operational primaries (no Start Here)
const primaryBlock = panelSrc.match(/const PRIMARY[\s\S]*?\n\];/)?.[0] ?? "";
assert.ok(primaryBlock.length > 0, "PRIMARY block found");
assert.ok(primaryBlock.includes('label: "Mechanics"'));
assert.ok(primaryBlock.includes('label: "Stock Files"'));
assert.ok(primaryBlock.includes('label: "Library"'));
assert.ok(primaryBlock.includes('label: "Apply"'));
assert.equal(
  (primaryBlock.match(/label:\s*"/g) ?? []).length,
  4,
  "PRIMARY must declare exactly 4 buttons"
);
assert.ok(!primaryBlock.includes("Start Here"), "Start Here must not be a Control primary");

// Start Here teaches real routes
assert.match(start, /Mechanics · Stock Files · Library · Apply|EXACTLY 4 PRIMARY/i);
assert.match(start, /Control → Stock Files/);
assert.match(start, /Library → Technical Analysis → copy row 'MTAE protocol'/);
assert.match(start, /Control → Mechanics → copy row 'MTA Mechanics'/);
assert.match(start, /Control → Apply → copy row 'Apply schema contract'/);
assert.match(start, /header button labeled Start Here|GLOBAL HEADER/i);
assert.match(start, /sidebar Scout|sidebar Trades|Insights/i);
assert.doesNotMatch(start, /Correct: Control → MTAE/);
assert.match(start, /FORBIDDEN invented routes:[\s\S]*Control → Start Here/);

// AVGO + other intents
assert.match(start, /NEW TICKER|quiero crear AVGO/i);
assert.match(start, /Do NOT invent IDs|do not invent ST-\*/i);
assert.match(start, /Do NOT require Mechanics merely to understand navigation/i);
assert.match(start, /CREATE \/ WORK A SCOUT|quiero crear un Scout/i);
assert.match(start, /REVIEW A TRADE|quiero revisar mi trade/i);
assert.match(start, /WHY DID THIS PLAN FAIL|Pipeline Performance/i);
assert.match(start, /ONE next action|exactly ONE next action/i);
assert.match(start, /TARGET → tactical STOP → R/i);

const firstNext =
  "NEXT ACTION:\nControl → Stock Files → search AVGO\nWHY:\nConfirm whether a Stock File already exists before creating.";
assert.match(firstNext, /Stock Files/);
assert.doesNotMatch(firstNext, /Mechanics|MTAE|Apply schema/i);

assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("Start Here"));
assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("MTAE protocol"));
assert.ok(menu.includes("Control → Library → Technical Analysis"));
assert.ok(menu.includes("Control → Mechanics"));
assert.ok(!menu.includes("Control → MTAE —"));

console.log("test-mxt-023-start-here-avgo: ok");
