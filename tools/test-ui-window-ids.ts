/**
 * UI window id resolver — human screen labels.
 * Run: npx tsx tools/test-ui-window-ids.ts
 */
import assert from "node:assert/strict";
import { resolveUiWindowId } from "../lib/ui-window-ids";

const cases: Array<[string, string]> = [
  ["/home-preview", "UI·dashboard"],
  ["/planning", "UI·scout"],
  ["/planning/capital", "UI·capital-planner"],
  ["/settings/capital", "UI·capital-settings"],
  ["/trades", "UI·trades"],
  ["/trades/H002", "UI·trade-detail"],
  ["/trades/H002/review", "UI·trade-review"],
  ["/trades/new", "UI·enter-trade"],
  ["/stock-theses/ST-AMZN-001", "UI·stock-file"],
  ["/stock-theses/new", "UI·stock-file-new"],
  ["/playbook", "UI·playbook"],
  ["/inbox", "UI·history"],
  ["/inbox/PROP-1", "UI·history-item"],
  ["/system", "UI·system"],
  ["/stats", "UI·stats"],
  ["/journal", "UI·journal"],
  ["/mistakes", "UI·mistakes"],
  ["/review", "UI·review-queue"],
  ["/exchange", "UI·exchange"],
  ["/ai-bridge", "UI·ai-bridge"],
  ["/connect", "UI·connect"],
  ["/", "UI·home"],
];

for (const [path, expected] of cases) {
  assert.equal(resolveUiWindowId(path), expected, path);
  // Canonical /mxt/* and temporary /mta/* resolve to the same window ids.
  if (path !== "/") {
    assert.equal(resolveUiWindowId(`/mxt${path}`), expected, `/mxt${path}`);
    assert.equal(resolveUiWindowId(`/mta${path}`), expected, `/mta${path}`);
  }
}

assert.equal(resolveUiWindowId("/mxt/home-preview"), "UI·dashboard");
assert.equal(resolveUiWindowId("/mta/home-preview"), "UI·dashboard");
assert.equal(resolveUiWindowId("/trades/H002/"), "UI·trade-detail");
assert.equal(resolveUiWindowId("/mxt/trades/H002/"), "UI·trade-detail");
assert.equal(resolveUiWindowId(null), null);

console.log("test-ui-window-ids: ok");
