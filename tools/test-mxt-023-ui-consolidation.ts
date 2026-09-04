/**
 * MXT 023 — Control consolidation: Start Here is GLOBAL; Control = Mechanics · Stock Files · Library · Apply.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { buildStockFileAnalyzePackage } from "../lib/stock-file-analyze";
import { buildApplySchemaContractText } from "../lib/apply-schema-contract";
import { buildStartHereBrief } from "../lib/start-here-brief";
import { buildLibraryIndexBrief } from "../lib/library-index";
import {
  VISIBLE_SNAPSHOT_MENU,
  VISIBLE_SNAPSHOT_MENU_LABELS,
  formatSnapshotMenuForMechanics,
} from "../lib/visible-snapshot-menu";
import type { StockThesis } from "../lib/stock-thesis-types";
import type { MtaeTimeframeMapPreset } from "../lib/mtae-types";

const brief = buildMatrixMechanicsBrief();
const menu = formatSnapshotMenuForMechanics();
const start = buildStartHereBrief();
const library = buildLibraryIndexBrief();

assert.match(brief, /MAF · MATRIX ATTRIBUTION FRAMEWORK|MAF — MATRIX ATTRIBUTION FRAMEWORK/);
assert.match(brief, /ENTRY SOLVER \(Mechanics\)/);
assert.match(brief, /R SEMANTICS/);
assert.match(brief, /TARGET \+ TIMEFRAME GOVERNANCE/);
assert.match(brief, /SELF-CONTAINED CONSTITUTION/);
assert.match(brief, /do not ask for separate MAF protocol or Entry Solver/i);

assert.ok(!VISIBLE_SNAPSHOT_MENU_LABELS.includes("MAF attribution protocol"));
assert.ok(!VISIBLE_SNAPSHOT_MENU_LABELS.includes("Entry Solver"));
assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("Start Here"));
assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("MTA Mechanics"));
assert.ok(VISIBLE_SNAPSHOT_MENU_LABELS.includes("Apply schema contract"));
assert.ok(!menu.includes("third copy row"));
assert.ok(!menu.includes("Control → Library → MAF"));
assert.match(menu, /Mechanics · Stock Files · Library · Apply/);
assert.match(menu, /Start Here is the header button next to Control/);

const startEntry = VISIBLE_SNAPSHOT_MENU.find((e) => e.label === "Start Here");
assert.ok(startEntry?.where.includes("header"));
assert.ok(startEntry?.where.includes("outside Control") || startEntry?.where.includes("next to Control"));
const mechEntry = VISIBLE_SNAPSHOT_MENU.find((e) => e.label === "MTA Mechanics");
assert.equal(mechEntry?.where, "Control → Mechanics");
const schemaEntry = VISIBLE_SNAPSHOT_MENU.find((e) => e.label === "Apply schema contract");
assert.ok(schemaEntry?.where.includes("Control → Apply"));

const panelSrc = readFileSync(
  join(process.cwd(), "app/components/control-panel/MatrixControlPanel.tsx"),
  "utf8"
);
assert.doesNotMatch(panelSrc, /label=["']Entry Solver["']/);
assert.doesNotMatch(panelSrc, /label=["']MAF attribution protocol["']/);
assert.match(panelSrc, /label:\s*["']Mechanics["']/);
assert.match(panelSrc, /label:\s*["']Stock Files["']/);
assert.match(panelSrc, /label:\s*["']Library["']/);
assert.match(panelSrc, /label:\s*["']Apply["']/);
assert.match(panelSrc, /Exactly four Control primaries/);
assert.match(panelSrc, /label=["']MTA Mechanics["']/);
assert.match(panelSrc, /label=["']Apply schema contract["']/);
assert.doesNotMatch(panelSrc, /label=["']Start Here["']/);

{
  const primaryBlock = panelSrc.match(/const PRIMARY[\s\S]*?\n\];/)?.[0] ?? "";
  assert.ok(primaryBlock.length > 0, "PRIMARY block found");
  assert.doesNotMatch(primaryBlock, /start-here|Start Here/);
  assert.match(primaryBlock, /Mechanics/);
  assert.match(primaryBlock, /Library/);
  assert.equal((primaryBlock.match(/label:\s*"/g) ?? []).length, 4);
}

const chromeSrc = readFileSync(
  join(process.cwd(), "app/components/preview/MatrixDesktopChrome.tsx"),
  "utf8"
);
assert.match(chromeSrc, /StartHereButton/);
assert.match(chromeSrc, /ControlPanelButton/);

const loadSrc = readFileSync(
  join(process.cwd(), "lib/load-control-panel-data.ts"),
  "utf8"
);
assert.doesNotMatch(loadSrc, /label:\s*["']Entry Solver["']/);
assert.doesNotMatch(loadSrc, /mafProtocolBrief/);
assert.match(loadSrc, /buildStartHereBrief/);

assert.match(start, /PLAYBOOK → STOCK FILE → SCOUT PLAN → TRADE/);
assert.match(start, /Control → Stock Files/);
assert.match(start, /TARGET → tactical STOP → R/);
assert.match(start, /quiero crear AVGO|NEW TICKER/i);
assert.match(start, /Do NOT require Mechanics merely to understand navigation/i);
assert.match(start, /header button labeled Start Here|GLOBAL HEADER/i);
assert.match(start, /Correct: Control → Mechanics → copy row 'MTA Mechanics'/);
assert.doesNotMatch(start, /Correct: Control → MTAE/);
assert.match(start, /FORBIDDEN invented routes:[\s\S]*Control → Start Here/);
assert.match(library, /Control → Mechanics → copy row 'MTA Mechanics'/);
assert.match(library, /Control → Apply → 'Apply schema contract'/);
assert.match(library, /Start Here is GLOBAL/);

const thesis = {
  id: "ST-TEST-001",
  ticker: "TEST",
  status: "watching",
  style: "swing",
  version: 1,
  thesis: "Bullish",
  currentHypothesis: "Wait",
  levels: { primaryZone: { low: 100, high: 110 } },
  riskRules: { minimumRR: 2.5, invalidation: "below 90" },
  notes: "",
  historicalAnalysis: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as StockThesis;

const presets: MtaeTimeframeMapPreset[] = [
  {
    id: "swing-6m",
    label: "Swing 6M",
    roles: {
      strategic_tf: "6M",
      opportunity_tf: "3M",
      refinement_tf: "1M",
      execution_tf: "1W",
    },
  },
];

const pkg = buildStockFileAnalyzePackage({
  thesis,
  plans: [],
  mtaePresets: presets,
  riskBudgetUsd: 100,
});
assert.match(pkg, /MATRIX MECHANICS/);
assert.match(pkg, /R SEMANTICS/);
assert.match(pkg, /ENTRY SOLVER \(Mechanics\)/);
assert.match(pkg, /MAF · MATRIX ATTRIBUTION FRAMEWORK|MAF — MATRIX ATTRIBUTION FRAMEWORK/);
assert.match(pkg, /TARGET \+ TIMEFRAME GOVERNANCE/);
assert.match(pkg, /FORBIDDEN responses:[\s\S]*MAF protocol[\s\S]*Entry Solver/);

const apply = buildApplySchemaContractText();
assert.match(apply, /Apply schema contract|required fields|allowed/i);
assert.match(apply, /Control → Apply/);
assert.ok(
  VISIBLE_SNAPSHOT_MENU.some((e) => e.label === "Apply schema contract" && e.kind === "copy_row")
);

console.log("test-mxt-023-ui-consolidation: ok");
