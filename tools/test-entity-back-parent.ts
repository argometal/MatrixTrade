/**
 * Smoke: entity detail Back returns to parent browse (visible on desktop too).
 * Topics previously hid ← Topics with lg:hidden while unmounting the list.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const topicPanel = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicDetailPanel.tsx"),
  "utf8"
);
const eventPanel = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventDetailPanel.tsx"),
  "utf8"
);
const inboxPanel = readFileSync(
  join(root, "app/argus/v2/inbox/components/V2InboxDetailPanel.tsx"),
  "utf8"
);
const topicsShell = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicsShell.tsx"),
  "utf8"
);
const eventsShell = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventsShell.tsx"),
  "utf8"
);
const projectPage = readFileSync(join(root, "app/argus/v2/projects/[id]/page.tsx"), "utf8");
const orgPage = readFileSync(join(root, "app/argus/v2/organizations/[id]/page.tsx"), "utf8");
const network = readFileSync(
  join(root, "app/argus/v2/network/components/NetworkContactShell.tsx"),
  "utf8"
);
const selection = readFileSync(join(root, "lib/argus/v2/selection.ts"), "utf8");

assert.match(topicPanel, /← Topics/, "Topic back label");
assert.doesNotMatch(
  topicPanel,
  /lg:hidden[\s\S]{0,80}← Topics|← Topics[\s\S]{0,120}lg:hidden/,
  "Topic Back must not be desktop-hidden"
);
assert.match(eventPanel, /← Events/, "Event back label");
assert.doesNotMatch(
  eventPanel,
  /className="shrink-0 border-b border-zinc-800\/80 px-4 py-3 lg:hidden"/,
  "Event Back chrome must be visible on desktop"
);
assert.doesNotMatch(
  inboxPanel,
  /className="shrink-0 border-b border-zinc-800\/80 px-4 py-3 lg:hidden"/,
  "Inbox Back chrome must be visible on desktop"
);

assert.match(
  topicsShell,
  /params\.delete\("selected"\);\s*params\.delete\("focus"\);\s*params\.delete\("from"\)/,
  "Topics Back clears selection + intelligence focus"
);
assert.match(
  eventsShell,
  /params\.delete\("selected"\);\s*params\.delete\("focus"\);\s*params\.delete\("from"\)/,
  "Events Back clears selection + intelligence focus"
);
assert.match(eventsShell, /onBack=\{backToList\}/, "Events focus mode has Back");

assert.match(projectPage, /Back to Projects/, "Project → browse parent");
assert.match(orgPage, /Back to Organizations/, "Org → browse parent");
assert.match(network, /Back to Network/, "Person → Network browse");

assert.match(
  selection,
  /URL is source of truth/,
  "selection helper documents no SSR resurrect after Back"
);
assert.match(
  topicsShell,
  /URL is source of truth/,
  "Topics selectedId follows URL only"
);

console.log("ok: entity-back-parent");
