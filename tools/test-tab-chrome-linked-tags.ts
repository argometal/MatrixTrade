/**
 * Smoke: no redundant Chronicle/Tags/Links tab titles; linked tags labeled clearly.
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
const loaders = readFileSync(join(root, "lib/argus/v2/event-loaders.ts"), "utf8");
const project = readFileSync(join(root, "app/argus/v2/components/V2ProjectShell.tsx"), "utf8");
const org = readFileSync(join(root, "app/argus/v2/components/V2OrgShell.tsx"), "utf8");
const ux = readFileSync(join(root, "lib/argus/ux-copy.ts"), "utf8");

assert.doesNotMatch(
  event,
  /text-xs font-medium text-zinc-300">Chronicle</,
  "Event Chronicle tab must not repeat Chronicle title"
);
assert.doesNotMatch(
  topic,
  /text-xs font-medium text-zinc-300">Chronicle</,
  "Topic Chronicle tab must not repeat Chronicle title"
);
assert.doesNotMatch(links, />Links</, "Links tab must not repeat Links label");
assert.doesNotMatch(
  binder,
  /text-xs font-medium text-zinc-300">Tags</,
  "Tags tab must not repeat Tags title row"
);

assert.match(event, /Linked to this Event/, "Event Tags heading is Linked to this Event");
assert.match(topic, /Topic Tags/, "Topic Tags heading names the binder section");
assert.match(topic, /Tags in this Topic/, "Topic Tags shows Topic-direct evidence section");
assert.match(event, /attachedTags=\{selected\.eventTags\}/, "Event attached = binder eventTags");
assert.match(topic, /attachedTags=\{selected\.aliases\}/, "Topic attached = binder aliases");
assert.match(loaders, /Notes on this Event/, "Branch evidence labeled Notes on this Event");
assert.match(project, /Linked to this Project/, "Project linked tags heading");
assert.match(project, /tab === "Tags"/, "Project has Tags tab");
assert.match(project, /entity\.projectTags/, "Project Tags use projectTags");
assert.match(org, /Linked to this Organization/, "Org linked tags heading");
assert.match(org, /tab === "Tags"/, "Org has Tags tab");
assert.match(org, /Tags on this Organization/, "Org Tags tab heading");
assert.match(ux, /No tags linked to this Event yet/, "Event empty copy says linked");
assert.match(ux, /No tags linked to this Topic yet/, "Topic empty copy says linked");

console.log("ok: tab-chrome-linked-tags");
