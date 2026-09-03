/**
 * P14C — register-local-env must restore supabase* when shell accidentally sets json.
 * Run: node tools/test-mxt-register-local-env-p14c.cjs
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");

function run(env) {
  const script = `
    require('./tools/register-local-env.cjs');
    console.log(JSON.stringify({
      store: process.env.TRADES_STORE,
      ro: process.env.MXT_READ_ONLY,
      host: process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : null
    }));
  `;
  const r = spawnSync(process.execPath, ["-e", script], {
    cwd: root,
    env: { ...process.env, ...env, MXT_ENV_QUIET: "1" },
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || "spawn failed");
  }
  const line = r.stdout
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.startsWith("{"))
    .pop();
  return JSON.parse(line);
}

const restored = run({
  TRADES_STORE: "json",
  MXT_ALLOW_JSON_STORE: "",
});
assert.notEqual(restored.store, "json");
assert.ok(
  restored.store === "supabase" || restored.store === "supabase-readonly"
);
assert.equal(restored.host, "rnbgxspcmxtflpcisrew.supabase.co");

const allowed = run({
  TRADES_STORE: "json",
  MXT_ALLOW_JSON_STORE: "1",
  MXT_READ_ONLY: "",
});
assert.equal(allowed.store, "json");

console.log("test-mxt-register-local-env-p14c: PASS");
