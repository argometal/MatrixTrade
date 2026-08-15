/**
 * Smoke: Topic Chronicle shows tags + Open Event; Event blocks are quick/expandable.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());
const stream = readFileSync(join(root, "lib/argus/v2/evidence-stream.ts"), "utf8");
const loaders = readFileSync(join(root, "lib/argus/v2/topic-loaders.ts"), "utf8");
const topic = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicDetailPanel.tsx"),
  "utf8"
);
const list = readFileSync(
  join(root, "app/argus/v2/components/V2ChronicleSelectableList.tsx"),
  "utf8"
);

assert.match(stream, /tags\?: string\[\]/, "evidence stream carries tags");
assert.match(stream, /sourceEventHref\?: string/, "evidence stream carries Event href");
assert.match(loaders, /sourceEventHref:/, "Topic rollup sets sourceEventHref");
assert.match(topic, /Open Event/, "Topic Chronicle/inspect expose Open Event");
assert.match(topic, /View Event Chronicle/, "Links inspect has View Event Chronicle CTA");
assert.match(topic, /From linked Events/, "Topic Chronicle groups Event evidence");
assert.match(topic, /expandedChronicleEventIds/, "Event chronicle blocks expand/collapse");
assert.match(topic, /quick view · expand to read/, "Event blocks start as quick view");
assert.match(topic, /Quick view · Event/, "Links inspect is compact quick view");
assert.match(topic, /inspectExpanded/, "Links inspect expands for mix & tags");
assert.match(list, /footer\?:/, "Chronicle list supports footer outside primary href");
assert.match(list, /Show note|Hide note/, "Chronicle note bodies stay hidden until shown");
assert.doesNotMatch(list, /line-clamp-2/, "collapsed notes leave no clamped preview");

console.log("ok: topic-chronicle-tags-event-link");
