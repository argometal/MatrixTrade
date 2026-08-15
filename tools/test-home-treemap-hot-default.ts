/**
 * Smoke: Treemap defaults to Hot; Portfolio / Tags default to Universe (no Hot option).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  INTELLIGENCE_DEFAULT_FILTER,
  coerceIntelligenceFilterForSurface,
  filterIntelligenceNodes,
  intelligenceDefaultFilterForSurface,
  intelligenceFiltersForSurface,
} from "../lib/argus/v2/intelligence-filters";

assert.equal(INTELLIGENCE_DEFAULT_FILTER, "hot");
assert.equal(intelligenceDefaultFilterForSurface("treemap"), "hot");
assert.equal(intelligenceDefaultFilterForSurface("portfolio"), "all");
assert.equal(intelligenceDefaultFilterForSurface("tags"), "all");

assert.ok(
  intelligenceFiltersForSurface("treemap").some((f) => f.id === "hot"),
  "Treemap keeps Hot"
);
assert.ok(
  !intelligenceFiltersForSurface("portfolio").some((f) => f.id === "hot"),
  "Portfolio has no Hot"
);
assert.ok(
  !intelligenceFiltersForSurface("tags").some((f) => f.id === "hot"),
  "Tags has no Hot"
);
assert.equal(coerceIntelligenceFilterForSurface("tags", "hot"), "all");
assert.equal(coerceIntelligenceFilterForSurface("treemap", "hot"), "hot");

const sample = [
  { evidenceCount: 2, recurrence30d: 1, recencyScore: 1, tagPatternCount: 0 },
  { evidenceCount: 3, recurrence30d: 0, recencyScore: 0, tagPatternCount: 1 },
];
assert.equal(filterIntelligenceNodes(sample, "hot").length, 1);
assert.equal(filterIntelligenceNodes(sample, "all").length, 2);

const client = readFileSync(join(process.cwd(), "app/argus/v2/components/V2HomeClient.tsx"), "utf8");
assert.match(client, /intelligenceDefaultFilterForSurface\(intelTab\)/, "tab switch resets per surface");

const toolbar = readFileSync(
  join(process.cwd(), "app/argus/v2/components/V2HomeIntelToolbar.tsx"),
  "utf8"
);
assert.match(toolbar, /intelligenceFiltersForSurface\(intelTab\)/, "toolbar filters by surface");
assert.match(toolbar, /Hot is Treemap-only/, "toolbar copy documents Hot scope");

console.log("ok: home treemap Hot-only; Portfolio/Tags Universe");
