/**
 * Smoke: Home Intelligence defaults to Hot (not Universe).
 */
import assert from "node:assert/strict";
import {
  INTELLIGENCE_DEFAULT_FILTER,
  INTELLIGENCE_UNIVERSE_FILTERS,
  filterIntelligenceNodes,
} from "../lib/argus/v2/intelligence-filters";

assert.equal(INTELLIGENCE_DEFAULT_FILTER, "hot");
assert.equal(INTELLIGENCE_UNIVERSE_FILTERS[0]?.id, "hot");

const sample = [
  { evidenceCount: 2, recurrence30d: 1, recencyScore: 1, tagPatternCount: 0 },
  { evidenceCount: 3, recurrence30d: 0, recencyScore: 0, tagPatternCount: 1 },
];

assert.equal(filterIntelligenceNodes(sample, "hot").length, 1);
assert.equal(filterIntelligenceNodes(sample, "all").length, 2);

console.log("ok: home treemap default is Hot");
