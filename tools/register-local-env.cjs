/**
 * Prompt #12D / P14C — load local env before Next.js / tsx tools.
 *
 * Order:
 * 1) %USERPROFILE%\.matrixtrade\secrets.env + local.env (fill gaps only)
 * 2) project .env.local (fill gaps only)
 * 3) Canonical store guard: accidental shell TRADES_STORE=json must not
 *    silently beat project .env.local supabase* (root cause of “lost DB”).
 *    Opt out: MXT_ALLOW_JSON_STORE=1
 * 4) supabase-readonly → supabase + MXT_READ_ONLY=1
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function fillMissing(envMap) {
  for (const [key, value] of Object.entries(envMap)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

const secretsDir = path.join(os.homedir(), ".matrixtrade");
fillMissing(parseEnvFile(path.join(secretsDir, "secrets.env")));
fillMissing(parseEnvFile(path.join(secretsDir, "local.env")));

const projectEnvLocal = path.join(__dirname, "..", ".env.local");
const projectEnv = parseEnvFile(projectEnvLocal);
fillMissing(projectEnv);

const allowJson =
  process.env.MXT_ALLOW_JSON_STORE === "1" ||
  process.env.MXT_ALLOW_JSON_STORE === "true";

const projectStore = (projectEnv.TRADES_STORE || "").trim().toLowerCase();
const projectWantsSupabase =
  projectStore === "supabase" || projectStore === "supabase-readonly";
const currentStore = (process.env.TRADES_STORE || "").trim().toLowerCase();

if (!allowJson && projectWantsSupabase && currentStore === "json") {
  // Accidental shell override — restore project canonical store.
  process.env.TRADES_STORE = projectEnv.TRADES_STORE;
  if (projectEnv.MXT_READ_ONLY) {
    process.env.MXT_READ_ONLY = projectEnv.MXT_READ_ONLY;
  }
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"]) {
    if (projectEnv[k]) process.env[k] = projectEnv[k];
  }
  console.warn(
    "[mxt-env] Restored TRADES_STORE from .env.local (shell had json). " +
      "Set MXT_ALLOW_JSON_STORE=1 to keep JSON intentionally."
  );
}

// #12D: supabase-readonly implies read-only local against production data.
const store = process.env.TRADES_STORE?.trim().toLowerCase();
if (store === "supabase-readonly") {
  process.env.TRADES_STORE = "supabase";
  if (!process.env.MXT_READ_ONLY) process.env.MXT_READ_ONLY = "1";
}

if (process.env.MXT_ENV_QUIET !== "1") {
  const mode = process.env.TRADES_STORE || "(unset)";
  const ro = process.env.MXT_READ_ONLY || "(unset)";
  let host = "(none)";
  try {
    host = process.env.SUPABASE_URL
      ? new URL(process.env.SUPABASE_URL).host
      : "(none)";
  } catch {
    host = "(invalid)";
  }
  console.log(`[mxt-env] TRADES_STORE=${mode} MXT_READ_ONLY=${ro} host=${host}`);
}
