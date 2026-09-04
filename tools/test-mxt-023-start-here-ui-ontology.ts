/**
 * Start Here human-UI contract + ontology map.
 * FAIL if Start Here teaches internal ops as clickable UI.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildStartHereBrief } from "../lib/start-here-brief";
import {
  MXT_INTERNAL_OPS_NOT_UI,
  MXT_ONTOLOGY_UI_MAP,
  MXT_VISIBLE_NAV,
} from "../lib/mxt-ui-ontology-map";
import { AI_BRIDGE_BLOCK_TYPES } from "../lib/ai-bridge-types";
import { VISIBLE_SNAPSHOT_MENU_LABELS } from "../lib/visible-snapshot-menu";

const start = buildStartHereBrief();
const panelSrc = readFileSync(
  join(process.cwd(), "app/components/control-panel/MatrixControlPanel.tsx"),
  "utf8"
);
const chromeSrc = readFileSync(
  join(process.cwd(), "app/components/preview/MatrixDesktopChrome.tsx"),
  "utf8"
);
const navSrc = readFileSync(join(process.cwd(), "lib/preview-nav.ts"), "utf8");
const tradesSrc = readFileSync(
  join(process.cwd(), "app/components/trades-preview/TradesWorkspace.tsx"),
  "utf8"
);
const scoutSrc = readFileSync(
  join(process.cwd(), "app/components/planning-preview/PreviewPlanning.tsx"),
  "utf8"
);

// Layers + safety rule present
assert.match(start, /THREE LAYERS — NEVER CONFLATE/);
assert.match(start, /INTERNAL OPERATION SAFETY RULE/);
assert.match(start, /HUMAN ACTION CONTRACT/);
assert.match(start, /NEXT ACTION:/);
assert.match(start, /LOCATION:/);
assert.match(start, /EXPECTED RESULT:/);

// Global Start Here + Control 4
assert.match(chromeSrc, /StartHereButton/);
assert.match(panelSrc, /label:\s*"Mechanics"/);
assert.doesNotMatch(panelSrc, /label:\s*"Start Here"/);

// Real create surface exists in UI source
assert.match(tradesSrc, /New stock case/);
assert.match(scoutSrc, /New stock case/);
assert.match(start, /New stock case/);
assert.match(navSrc, /label: "Scout"/);
assert.match(navSrc, /label: "Trades"/);
assert.match(navSrc, /label: "Insights"/);

// Must NOT place internal ops inside NEXT ACTION lines
assert.doesNotMatch(start, /^NEXT ACTION:.*stock-case-create/im);
assert.doesNotMatch(start, /^NEXT ACTION:.*scout-plan-create/im);
assert.doesNotMatch(start, /Control\s*→\s*stock-case-create/i);
assert.doesNotMatch(start, /Control\s*→\s*scout-plan-create/i);
assert.doesNotMatch(start, /Use stock-case-create/i);
assert.doesNotMatch(start, /Choose file-update\.initialScout/i);
assert.doesNotMatch(start, /click stock-case-create/i);
assert.doesNotMatch(start, /click scout-plan-create/i);
assert.match(start, /Open New stock case/);
assert.match(start, /emit type stock-case-create|JSON note \(AI only/i);

for (const op of ["stock-case-create", "scout-plan-create", "file-update"] as const) {
  assert.ok(MXT_INTERNAL_OPS_NOT_UI.includes(op as (typeof MXT_INTERNAL_OPS_NOT_UI)[number]));
}

// Explicit anti-regression — internal ops OK only as JSON notes
assert.match(start, /emit type stock-case-create in the pasted block|emits internal type stock-case-create/i);
assert.match(start, /AI JSON type for a new plan is scout-plan-create|emits scout-plan-create/i);

// Ontology map covers create + scout + trades + insights + apply
const concepts = MXT_ONTOLOGY_UI_MAP.map((r) => r.concept);
assert.ok(concepts.some((c) => /Stock File \(new\)/.test(c)));
assert.ok(concepts.some((c) => /Scout Plan/.test(c)));
assert.ok(concepts.some((c) => c === "Trade"));
assert.ok(concepts.some((c) => /Plan outcome/.test(c)));
assert.ok(concepts.some((c) => /Apply persistence/.test(c)));

// Apply types in map include stock-case-create
assert.ok(AI_BRIDGE_BLOCK_TYPES.includes("stock-case-create"));
assert.ok(AI_BRIDGE_BLOCK_TYPES.includes("scout-plan-create"));

// Visible nav constants align with Start Here
for (const label of MXT_VISIBLE_NAV.controlPrimaries) {
  assert.match(start, new RegExp(label));
}
assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("Start Here"));
assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("MTA Mechanics"));
assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("Apply schema contract"));

// Intent routes
assert.match(start, /quiero crear AVGO/i);
assert.match(start, /Open New stock case/);
assert.match(start, /quiero crear un Scout/i);
assert.match(start, /Pipeline Performance/);
assert.match(start, /quiero guardar lo que analizamos/i);

console.log("test-mxt-023-start-here-ui-ontology: ok");
