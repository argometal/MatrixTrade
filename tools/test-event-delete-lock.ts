/**
 * Smoke: Event/Topic delete after lock — PIN preferred, entityKind fallback, inbox parity.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveLinkedDeleteUnlockMode } from "../lib/argus/delete-unlock-mode";

assert.equal(
  resolveLinkedDeleteUnlockMode({
    linkedRequiresAuthenticator: true,
    totpConfigured: false,
    deleteCodeConfigured: true,
  }),
  "pin",
  "PIN lock unlocks Event-linked deletes without TOTP"
);
assert.equal(
  resolveLinkedDeleteUnlockMode({
    linkedRequiresAuthenticator: true,
    totpConfigured: true,
    deleteCodeConfigured: true,
  }),
  "pin",
  "PIN still preferred when both configured"
);
assert.equal(
  resolveLinkedDeleteUnlockMode({
    linkedRequiresAuthenticator: true,
    totpConfigured: true,
    deleteCodeConfigured: false,
  }),
  "totp"
);

const root = process.cwd();
const actions = readFileSync(join(root, "app/argus/actions.ts"), "utf8");
const lifecycle = readFileSync(
  join(root, "app/argus/v2/components/V2EntityLifecycleActions.tsx"),
  "utf8"
);
const inboxDelete = readFileSync(
  join(root, "app/argus/v2/inbox/components/V2InboxDeleteControl.tsx"),
  "utf8"
);
const inboxBulk = readFileSync(
  join(root, "app/argus/v2/inbox/components/V2InboxBulkBar.tsx"),
  "utf8"
);
const eventPanel = readFileSync(
  join(root, "app/argus/v2/browse/events/components/V2EventDetailPanel.tsx"),
  "utf8"
);
const topicPanel = readFileSync(
  join(root, "app/argus/v2/browse/topics/components/V2TopicDetailPanel.tsx"),
  "utf8"
);
const auth = readFileSync(join(root, "app/auth/actions.ts"), "utf8");

assert.match(actions, /entityKindHint|formData\.get\("entityKind"\)/, "delete accepts entityKind");
assert.match(lifecycle, /formData\.set\("entityKind", entityKind\)/, "UI sends entityKind");
assert.match(inboxDelete, /resolveLinkedDeleteUnlockMode/, "inbox delete uses shared unlock mode");
assert.doesNotMatch(
  inboxDelete,
  /requiresAuthenticator && !totpConfigured/,
  "inbox must not hard-block Event-linked delete when only PIN exists"
);
assert.match(inboxBulk, /resolveLinkedDeleteUnlockMode/, "bulk delete uses shared unlock mode");
assert.match(
  eventPanel,
  /V2ChronicleSelectableList[\s\S]*requiresAuthenticator\n/,
  "Event chronicle linked unlock aware"
);
assert.match(
  topicPanel,
  /V2ChronicleSelectableList[\s\S]*requiresAuthenticator\n/,
  "Topic chronicle linked unlock aware"
);
assert.match(auth, /setArgusPrivateUnlock/, "delete PIN unlock may also unlock private");

console.log("ok: event-delete-lock");
