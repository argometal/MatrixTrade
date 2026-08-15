import assert from "node:assert/strict";
import { getMtaHelpTopic, MTA_HELP_TOPICS } from "../lib/mta/help-topics";

assert.ok(MTA_HELP_TOPICS.length >= 8);
for (const topic of MTA_HELP_TOPICS) {
  assert.ok(topic.id);
  assert.ok(topic.title);
  assert.ok(topic.items.length > 0);
  assert.equal(getMtaHelpTopic(topic.id)?.id, topic.id);
}

assert.equal(getMtaHelpTopic("missing"), undefined);
assert.ok(getMtaHelpTopic("dashboard-attention"));
assert.ok(getMtaHelpTopic("scout-funding"));
assert.ok(getMtaHelpTopic("trades-incomplete"));
assert.ok(getMtaHelpTopic("capital-settings"));

console.log("ok — mta help topics");
