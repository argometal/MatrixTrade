/**
 * Prompt #12D — load optional user secrets before Next.js / tsx tools.
 * Path: %USERPROFILE%\.matrixtrade\secrets.env (never committed).
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
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
    if (!process.env[key]) process.env[key] = value;
  }
}

const secretsDir = path.join(os.homedir(), ".matrixtrade");
loadEnvFile(path.join(secretsDir, "secrets.env"));
loadEnvFile(path.join(secretsDir, "local.env"));

// #12D: supabase-readonly implies read-only local against production data.
const store = process.env.TRADES_STORE?.trim().toLowerCase();
if (store === "supabase-readonly") {
  process.env.TRADES_STORE = "supabase";
  if (!process.env.MXT_READ_ONLY) process.env.MXT_READ_ONLY = "1";
}
