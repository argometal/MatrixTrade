/**
 * Smoke: global logout clears all app sessions (button + middleware kick).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const cookies = readFileSync(join(root, "lib/auth/cookies.ts"), "utf8");
const actions = readFileSync(join(root, "app/auth/actions.ts"), "utf8");
const middleware = readFileSync(join(root, "middleware.ts"), "utf8");
const signOut = readFileSync(join(root, "app/components/SignOutButton.tsx"), "utf8");
const systemsMenu = readFileSync(join(root, "app/apps/components/ForgePortalNav.tsx"), "utf8");
const v2Top = readFileSync(join(root, "app/argus/v2/components/V2TopBar.tsx"), "utf8");
const privateMenu = readFileSync(join(root, "app/argus/components/PrivateLockMenu.tsx"), "utf8");

assert.match(cookies, /export async function clearAllSessions/, "clearAllSessions exists");
assert.match(cookies, /jar\.delete\(MT_AUTH\)/, "clears mt-auth");
assert.match(cookies, /jar\.delete\(ARGUS_AUTH\)/, "clears argus-auth");
assert.match(cookies, /jar\.delete\(ARGUS_PRIVATE\)/, "clears private unlock");
assert.match(cookies, /jar\.delete\(ARGUS_DELETE\)/, "clears delete unlock");
assert.match(cookies, /jar\.delete\(ARGUS_DELETE_AUTH\)/, "clears delete-auth unlock");

assert.match(actions, /clearAllSessions\(\)/, "logoutAction clears all sessions");
assert.match(actions, /safeLogoutLoginPath/, "logout chooses trading vs Argus login");

assert.match(middleware, /function clearSessionCookies/, "middleware clears sessions");
assert.match(
  middleware,
  /Missing trading session[\s\S]*clearSessionCookies/,
  "trading kick clears sibling sessions"
);
assert.match(
  middleware,
  /Missing Argus\/Forge session[\s\S]*clearSessionCookies/,
  "Argus kick clears sibling sessions"
);

assert.match(signOut, /Sign out of MatrixTrade, Argus, and Forge/, "tooltip explains global logout");
assert.match(signOut, /loginPath/, "SignOutButton can land on Argus login");

assert.match(systemsMenu, /Sign out everywhere/, "A systems menu has global logout");
assert.match(v2Top, /SignOutButton/, "Argus v2 top bar has Sign out");
assert.match(privateMenu, /Sign out everywhere/, "private lock menu has global logout");

console.log("ok: global-logout");
