/**
 * Smoke: Topic/Event Runbooks pass organizationId so "Edit on organization"
 * works when an org is linked (parity with Project). Does not change executeMode.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const topic = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicDetailPanel.tsx"),
  "utf8"
);
const event = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventDetailPanel.tsx"),
  "utf8"
);
const project = readFileSync(join(root, "app/argus/v2/components/V2ProjectShell.tsx"), "utf8");
const tab = readFileSync(join(root, "app/argus/v2/components/V2EntityRunbooksTab.tsx"), "utf8");
const panel = readFileSync(join(root, "app/argus/v2/components/V2RunbookWorkPanel.tsx"), "utf8");

assert.match(project, /organizationId=\{org\?\.id\}/, "Project passes organizationId");
assert.match(
  topic,
  /organizationId=\{linkedOrgs\[0\]\?\.id\}/,
  "Topic passes linked org id into Runbooks tab"
);
assert.match(
  topic,
  /organizationName=\{linkedOrgs\[0\]\?\.name\}/,
  "Topic passes linked org name"
);
assert.match(
  event,
  /organizationId=\{selected\.linkedOrgs\[0\]\?\.id\}/,
  "Event passes linked org id into Runbooks tab"
);
assert.match(
  event,
  /organizationName=\{selected\.linkedOrgs\[0\]\?\.name\}/,
  "Event passes linked org name"
);

assert.match(tab, /editOnOrganizationHref/, "Entity runbooks builds org edit href");
assert.match(
  tab,
  /if \(isLibrary \|\| !organizationId \|\| !selectedId\) return null/,
  "Href requires organizationId in execute mode"
);
assert.match(panel, /Edit on organization \(link org first\)/, "Disabled CTA when no org");
assert.match(panel, /canEdit = !executeMode/, "Topic/Event stay execute-only (no template edit)");

console.log("ok: topic-event-runbook-org-edit");
