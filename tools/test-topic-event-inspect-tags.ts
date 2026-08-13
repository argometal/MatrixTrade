/**
 * Smoke: Topic Links Events use select-to-inspect (not instant navigate).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());
const links = readFileSync(join(root, "app/argus/v2/components/V2EntityLinksTab.tsx"), "utf8");
const topic = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicDetailPanel.tsx"),
  "utf8"
);
const loaders = readFileSync(join(root, "lib/argus/v2/topic-loaders.ts"), "utf8");

assert.match(links, /selectToInspect\?:/, "Links sections support select-to-inspect");
assert.match(links, /LinkedEntityOpenMenu/, "··· Open menu on inspect rows");
assert.match(links, /onDoubleClick/, "double-click opens entity");

assert.match(topic, /selectToInspect:\s*true/, "Topic Events section selects to inspect");
assert.match(topic, /inspectEventId/, "Topic holds inspected Event id");
assert.match(topic, /Selected event/, "Topic shows Event property panel");
assert.match(topic, /provenance=\{\{/, "Tags tab uses provenance layout");
assert.match(topic, /eventEvidenceTags\.map/, "Tags tab lists per-Event groups");
assert.match(topic, /event\.href/, "Open Event uses loader route");

assert.match(loaders, /readTagsForRole\(data, "event"/, "rollup includes Event binder tags");
assert.match(loaders, /noteTags/, "rollup splits Event Note tags");
assert.doesNotMatch(
  loaders,
  /if \(tags\.size === 0\) continue/,
  "linked Events are not dropped when only binder tags exist"
);

console.log("ok: topic-event-inspect-tags");
