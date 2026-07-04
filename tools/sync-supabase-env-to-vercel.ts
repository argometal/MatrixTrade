/**
 * Sync Supabase env from .env.local to Vercel (production + preview).
 * Does not print secret values.
 */
import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal(): Record<string, string> {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) throw new Error(".env.local not found");
  const out: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
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
    if (value) out[key] = value;
  }
  return out;
}

function runVercel(args: string[]): void {
  const vercel = join(ROOT, "tools", "vercel-env.bat");
  const result = spawnSync("cmd.exe", ["/c", vercel, ...args], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function updateEnv(name: string, value: string, target: string, sensitive = false): void {
  const args = ["env", "update", name, target, "--value", value, "--yes"];
  if (sensitive) args.push("--sensitive");
  console.log(`Updating ${name} (${target})...`);
  runVercel(args);
}

const env = loadEnvLocal();
const url = env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const store = env.TRADES_STORE ?? "supabase";
const inboxStore = env.ARGUS_INBOX_STORE ?? "supabase";
const inboxToken = env.ARGUS_INBOX_TOKEN;

if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

for (const target of ["production", "preview"]) {
  updateEnv("SUPABASE_URL", url, target);
  updateEnv("SUPABASE_SERVICE_ROLE_KEY", key, target, true);
  updateEnv("TRADES_STORE", store, target);
  updateEnv("ARGUS_INBOX_STORE", inboxStore, target);
  if (inboxToken) updateEnv("ARGUS_INBOX_TOKEN", inboxToken, target, true);
  if (env.ARGUS_PASSWORD) updateEnv("ARGUS_PASSWORD", env.ARGUS_PASSWORD, target, true);
}

console.log("Vercel env synced. Redeploy production for changes to apply.");
