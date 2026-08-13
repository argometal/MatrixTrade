/**
 * Smoke: Tracker truth T1 — passive ⚑, ownership Trackers, help, hasTracker D.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());
const binder = readFileSync(join(root, "app/argus/v2/components/V2BinderTagsTab.tsx"), "utf8");
const help = readFileSync(join(root, "lib/argus/v2/help-topics.ts"), "utf8");
const viz = readFileSync(join(root, "lib/argus/v2/intelligence-viz.ts"), "utf8");
const watched = readFileSync(join(root, "lib/argus/v2/entity-watched.ts"), "utf8");
const eventPanel = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventDetailPanel.tsx"),
  "utf8"
);
const topicHelp = help.slice(help.indexOf('id: "topic-tags"'), help.indexOf('id: "project-tags"'));

assert.match(watched, /Definition D/, "entity-watched documents definition D");
assert.match(watched, /ownershipTagsForEntity/, "ownership helper exported");
assert.match(viz, /watchedTrackerTagsOnEntity/, "Home hasTracker uses watched helper");
assert.match(binder, /ownershipTagKeys/, "Trackers section uses ownership keys");
assert.match(binder, /Tracked/, "passive Tracked label on rows");
assert.match(binder, /Journal Flags that appear/, "Trackers copy clarifies journal Flags");
assert.doesNotMatch(
  binder,
  /attachedKeys\.has\(key\) \|\| branchTagKeys/,
  "old branch-inclusive contextTrackers removed"
);
assert.match(eventPanel, /ownershipBranchGroupIds=\{\["event"\]\}/, "Event ownership excludes Topic branch");
assert.match(topicHelp, /By Event/, "Topic help describes By Event");
assert.doesNotMatch(topicHelp, /click to Flag\/Disable Tracker/, "stale click-to-Flag help removed");
assert.match(topicHelp, /Topic does not own/, "Topic help: no Event Tracker ownership");

console.log("ok: tracker-watched-truth-ui");
