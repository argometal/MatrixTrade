/**
 * Smoke: Topic/Event browse expand-collapse + Topics desktop split.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const topicsShell = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicsShell.tsx"),
  "utf8"
);
const eventsShell = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventsShell.tsx"),
  "utf8"
);
const header = readFileSync(
  join(root, "app/argus/v2/components/V2DetailCompactHeader.tsx"),
  "utf8"
);

assert.match(topicsShell, /lg:flex-row/, "Topics browse uses desktop split");
assert.doesNotMatch(
  topicsShell,
  /\(focus && selected\) \|\| \(selected && mobileDetailOpen\)/,
  "Topics no longer full-replaces list on every selection"
);
assert.match(topicsShell, /eventsOpen/, "Topic list rows expand Events");
assert.match(topicsShell, /Collapse events|Expand events/, "Topic event disclosure labels");

assert.match(eventsShell, /topicsOpen/, "Event list rows expand Topics");
assert.match(eventsShell, /EventListRow/, "Event list uses expandable row");

assert.match(header, /isNarrow/, "Compact header is viewport-aware");
assert.doesNotMatch(header, /lg:hidden/, "Hide-header control is available when expanded");

console.log("ok: topic-event-expand-collapse");
