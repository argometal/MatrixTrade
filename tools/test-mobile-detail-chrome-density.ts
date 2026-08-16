/**
 * Smoke: detail chrome — no pinned compact upper bar; header stacks on phone; Tags help is one ?.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());
const event = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventDetailPanel.tsx"),
  "utf8"
);
const topic = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicDetailPanel.tsx"),
  "utf8"
);
const inbox = readFileSync(
  join(root, "app/argus/v2/inbox/components/V2InboxDetailPanel.tsx"),
  "utf8"
);
const header = readFileSync(
  join(root, "app/argus/v2/components/V2DetailCompactHeader.tsx"),
  "utf8"
);
const binder = readFileSync(join(root, "app/argus/v2/components/V2BinderTagsTab.tsx"), "utf8");
const links = readFileSync(join(root, "app/argus/v2/components/V2EntityLinksTab.tsx"), "utf8");
const project = readFileSync(join(root, "app/argus/v2/projects/[id]/page.tsx"), "utf8");
const org = readFileSync(join(root, "app/argus/v2/organizations/[id]/page.tsx"), "utf8");

assert.match(event, /const compactChrome = false/, "Event disables pinned compact chrome");
assert.match(topic, /const compactChrome = false/, "Topic disables pinned compact chrome");
assert.match(inbox, /const compactChrome = false/, "Inbox disables pinned compact chrome");
assert.match(
  header,
  /Always render the full expanded header/,
  "Compact header component no longer pins Details/Hide header bar"
);
assert.doesNotMatch(header, /Hide header · more room to read/, "Hide header control removed");
assert.doesNotMatch(header, />\s*Details\s*</, "Details expand control removed");

assert.match(
  topic,
  /argus-v2-scroll min-h-0 flex-1 overflow-y-auto[\s\S]*← Topics/,
  "Topic back + header live inside the scroll region"
);
assert.doesNotMatch(
  topic,
  /shrink-0 border-b border-zinc-800\/80 p-3 sm:p-5/,
  "Topic detail header is not a pinned shrink-0 upper bar"
);
assert.doesNotMatch(
  event,
  /shrink-0 overflow-visible border-b border-zinc-800\/80 p-3/,
  "Event detail header is not a pinned shrink-0 upper bar"
);

assert.match(
  event,
  /flex flex-col gap-3 lg:flex-row/,
  "Event expanded header stacks on phone"
);
assert.match(event, /w-full lg:flex-1/, "Event title column is full width on phone");
assert.doesNotMatch(event, /pickerHintOnNote/, "Note tab drops inline picker hint copy");

assert.match(topic, /flex flex-col gap-3 lg:flex-row/, "Topic expanded header stacks on phone");

assert.match(binder, /V2IntelHelpLink/, "Tags tab wires contextual ?");
assert.match(binder, /showAboutRail = false/, "About rail off by default");
assert.doesNotMatch(
  binder,
  /These Tags are being tracked\. ARGUS will surface/,
  "Tracker paragraph removed from Tags UI"
);
assert.doesNotMatch(
  binder,
  /Explore the complete Tag universe/,
  "Universe prose removed from Tags UI"
);

assert.doesNotMatch(
  links,
  /<p className="text-sm text-zinc-500">\{intro\}<\/p>/,
  "Links intro paragraph removed (lives in ?)"
);

assert.match(project, /flex flex-col gap-3 lg:flex-row/, "Project header stacks on phone");
assert.match(org, /flex flex-col gap-3 lg:flex-row/, "Org header stacks on phone");
assert.match(project, /orientation="stack"/, "Project tag patterns vertical on phone");
assert.match(org, /orientation="stack"/, "Org tag patterns vertical on phone");

console.log("ok: mobile-detail-chrome-density");
