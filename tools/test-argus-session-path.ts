import assert from "node:assert/strict";
import { isArgusSessionPath } from "../lib/auth/argus-session-path";

assert.equal(isArgusSessionPath("/argus/login"), false);
assert.equal(isArgusSessionPath("/argus/v2"), true);
assert.equal(isArgusSessionPath("/argus/v2/inbox"), true);
assert.equal(isArgusSessionPath("/forge"), true);
assert.equal(isArgusSessionPath("/forge/chaos"), true);
assert.equal(isArgusSessionPath("/forge/deck/abc"), true);
assert.equal(isArgusSessionPath("/home-preview"), false);
assert.equal(isArgusSessionPath("/apps"), false);
assert.equal(isArgusSessionPath("/login"), false);

console.log("ok — argus session path (forge shares Argus auth)");
