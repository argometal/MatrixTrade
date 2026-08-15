/**
 * Smoke: Topic/Event browse expand-collapse + Topics full-screen detail (no side preview).
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

assert.doesNotMatch(
  topicsShell,
  /lg:flex-row/,
  "Topics browse is not a desktop list+preview split"
);
assert.match(
  topicsShell,
  /if \(selected\) \{\s*return \(/,
  "Topics opens selected Topic as a full detail screen"
);
assert.doesNotMatch(
  topicsShell,
  /function selectItem[\s\S]*?params\.set\("focus", "1"\)/,
  "Normal Topic open does not force Intelligence focus banner"
);
assert.match(topicsShell, /eventsOpen/, "Topic list rows expand Events");
assert.match(topicsShell, /Collapse events|Expand events/, "Topic event disclosure labels");

assert.match(eventsShell, /topicsOpen/, "Event list rows expand Topics");
assert.match(eventsShell, /EventListRow/, "Event list uses expandable row");

assert.match(topicsShell, /backToList/, "Topics detail can return to the list");
assert.match(
  topicsShell,
  /if \(selected\) \{[\s\S]*V2TopicDetailPanel/,
  "Topic detail mounts only while a Topic is selected"
);
assert.match(eventsShell, /Hide preview|backToList|selected \?/, "Events preview can fully hide");
assert.match(eventsShell, /urlSelected === id/, "Re-selecting an Event hides the detail viewer");
assert.match(
  eventsShell,
  /selected\s*\?\s*\([\s\S]*V2EventDetailPanel/,
  "Event preview pane mounts only while an Event is selected"
);

const topicDetail = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicDetailPanel.tsx"),
  "utf8"
);
assert.doesNotMatch(
  topicDetail,
  /onBack \? \(\s*<div className="[^"]*lg:hidden/,
  "Topic back control is available on desktop, not mobile-only"
);
assert.match(
  topicDetail,
  /expandedChronicleEventIds/,
  "Topic Chronicle Event blocks are expandable"
);
assert.match(topicDetail, /From linked Events/, "Event evidence is grouped in Chronicle");
assert.match(topicDetail, /Back to Topics|← Topics/, "Topic detail navigates back to the list");
assert.doesNotMatch(topicDetail, /Hide preview/, "Topic detail is not a hideable preview pane");

assert.match(header, /V2DetailCompactHeader|compact/, "Compact header still present");

const linksTab = readFileSync(
  join(root, "app/argus/v2/components/V2EntityLinksTab.tsx"),
  "utf8"
);
assert.match(linksTab, /useState\(false\)/, "Local graph starts collapsed");
assert.match(linksTab, /Collapse|Expand/, "Local graph expand/collapse labels");

const chronicleList = readFileSync(
  join(root, "app/argus/v2/components/V2ChronicleSelectableList.tsx"),
  "utf8"
);
assert.match(chronicleList, /Show note/, "Chronicle note body stays hidden until shown");
assert.doesNotMatch(
  chronicleList,
  /line-clamp-2/,
  "Collapsed Chronicle notes do not leave a clamped preview overlapping the UI"
);

console.log("ok: topic-event-expand-collapse");
