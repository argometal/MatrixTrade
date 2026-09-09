import assert from "node:assert/strict";
import { formatActionError } from "../lib/server-action-error";

const redirectLike = {
  digest: "NEXT_REDIRECT;replace;/login;307;",
};

assert.throws(
  () => formatActionError(redirectLike, "fallback"),
  (err) => err === redirectLike
);

const generic = formatActionError(new Error("boom"), "fallback");
assert.equal(generic.ok, false);
assert.equal(generic.error, "boom");

console.log("test-server-action-error: PASS");
