/**
 * Smoke: phone detail chrome — title not crushed; Tags help is one ?; no verbose binder hints when helpTopic set.
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
const binder = readFileSync(join(root, "app/argus/v2/components/V2BinderTagsTab.tsx"), "utf8");
const links = readFileSync(join(root, "app/argus/v2/components/V2EntityLinksTab.tsx"), "utf8");
const project = readFileSync(join(root, "app/argus/v2/projects/[id]/page.tsx"), "utf8");
const org = readFileSync(join(root, "app/argus/v2/organizations/[id]/page.tsx"), "utf8");

assert.match(event, /const compactChrome = mobileDetail;/, "Event phone uses compact chrome by default");
assert.match(
  event,
  /flex flex-col gap-3 lg:flex-row/,
  "Event expanded header stacks on phone"
);
assert.match(event, /w-full lg:flex-1/, "Event title column is full width on phone");
assert.doesNotMatch(event, /pickerHintOnNote/, "Note tab drops inline picker hint copy");

assert.match(topic, /const compactChrome = mobileDetail;/, "Topic phone uses compact chrome");
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
