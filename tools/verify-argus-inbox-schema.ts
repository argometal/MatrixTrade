/**
 * Verify Supabase ARGUS inbox schema and optionally probe insert.
 * Run supabase/argus-inbox.sql in Supabase SQL editor if tables are missing.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createSupabaseAdmin } from "../lib/supabase/server";

function loadEnvLocal(): void {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
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
    if (!process.env[key] && value) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadEnvLocal();
  process.env.ARGUS_INBOX_STORE = "supabase";
  const supabase = createSupabaseAdmin();

  const { error: inboxError } = await supabase.from("argus_inbox_items").select("id").limit(1);
  if (inboxError) {
    console.error("argus_inbox_items:", inboxError.message);
    console.error("\nRun this file in Supabase SQL editor:");
    console.error("  supabase/argus-inbox.sql");
    process.exit(1);
  }

  const { error: attError } = await supabase.from("argus_attachments").select("id").limit(1);
  if (attError) {
    console.error("argus_attachments:", attError.message);
    process.exit(1);
  }

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error("storage buckets:", bucketError.message);
    process.exit(1);
  }
  if (!buckets?.some((b) => b.name === "argus-files")) {
    console.error('Storage bucket "argus-files" missing. Run supabase/argus-inbox.sql');
    process.exit(1);
  }

  console.log("OK: argus_inbox_items, argus_attachments, argus-files bucket exist.");

  const token = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .find((l) => l.startsWith("ARGUS_INBOX_TOKEN="))
    ?.slice("ARGUS_INBOX_TOKEN=".length)
    .trim();
  if (!token) {
    console.log("ARGUS_INBOX_TOKEN not in .env.local — skip live POST test.");
    return;
  }

  const body = readFileSync(resolve(process.cwd(), "argus-email-bridge/sample-email-payload.json"), "utf8");
  const res = await fetch("https://matrix-trade-theta.vercel.app/api/argus/email-inbox", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body,
  });
  const text = await res.text();
  console.log(`Production POST: ${res.status}`);
  console.log(text.slice(0, 300));
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
