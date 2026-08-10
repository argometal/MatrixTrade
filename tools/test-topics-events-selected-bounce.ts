/**
 * Smoke: Topics/Events must not bounce `?selected=` off when status/triage filters
 * hide the card — that caused a Topics home-page loop (Manage board + deep links).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());
const topics = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicsShell.tsx"),
  "utf8"
);
const events = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventsShell.tsx"),
  "utf8"
);

assert.doesNotMatch(
  topics,
  /filtered\.length === 0 \|\| !filtered\.some\(\(card\) => card\.id === urlSelected\)/,
  "Topics must not clear selected when status filter hides the card"
);
assert.match(
  topics,
  /!details\.some\(\(d\) => d\.id === urlSelected\)/,
  "Topics only clears selected for unknown entity ids"
);

assert.doesNotMatch(
  events,
  /filtered\.length === 0 \|\| !filtered\.some\(\(row\) => row\.id === urlSelected\)/,
  "Events must not clear selected when triage/when hides the row"
);
assert.match(
  events,
  /!details\.some\(\(d\) => d\.id === urlSelected\)/,
  "Events only clears selected for unknown entity ids"
);

console.log("ok: topics-events-selected-bounce");
