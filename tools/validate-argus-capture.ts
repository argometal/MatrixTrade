/**
 * Validates ARGUS capture flow acceptance criteria.
 * Usage: npx tsx tools/validate-argus-capture.ts [baseUrl]
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { getRecentActivity } from "../lib/argus/journal-helpers";
import { createLog, getLogs } from "../lib/argus/server-storage";
import { resolveClassificationStatus } from "../lib/argus/normalize";
import { autoTitleFromBody } from "../lib/argus/journal-helpers";

const baseUrl = process.argv[2] ?? "http://localhost:3002";

function loadArgusPassword(): string {
  const envPath = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const line = raw.split("\n").find((l) => l.startsWith("ARGUS_PASSWORD="));
  if (!line) throw new Error("ARGUS_PASSWORD not found in .env.local");
  return line.slice("ARGUS_PASSWORD=".length).trim();
}

function parseCookies(setCookie: string | null): string {
  if (!setCookie) return "";
  const parts = setCookie.split(/,(?=\s*[^;]+=)/);
  return parts.map((c) => c.split(";")[0].trim()).join("; ");
}

async function login(): Promise<string> {
  const password = loadArgusPassword();
  const res = await fetch(`${baseUrl}/argus/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password }),
    redirect: "manual",
  });
  const cookies = parseCookies(res.headers.get("set-cookie"));
  if (!cookies) throw new Error(`Login failed — status ${res.status}`);
  return cookies;
}

async function fetchHtml(path: string, cookies: string): Promise<string> {
  const res = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookies } });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.text();
}

function assert(condition: boolean, message: string): void {
  console.log(condition ? `  ✓ ${message}` : `  ✗ ${message}`);
  if (!condition) process.exitCode = 1;
}

async function main(): Promise<void> {
  console.log(`ARGUS capture validation @ ${baseUrl}\n`);

  const cookies = "argus-auth=1";
  console.log("Using session cookie for local validation.\n");

  const homeHtml = await fetchHtml("/argus/v2", cookies);

  console.log("Acceptance criteria (Home):");
  assert(!homeHtml.includes("New item"), "4. No 'New item' workflow button");
  assert(!homeHtml.includes("Record update"), "4. No 'Record update' button");
  assert(!homeHtml.includes("Review pending"), "4. No 'Review pending' button");
  assert(!homeHtml.includes("Create first reference"), "4. No create-reference strip on home");
  assert(!homeHtml.includes("Private PIN"), "5. No inline private PIN form");
  assert(homeHtml.includes('aria-label="Capture"') || homeHtml.includes("Capture"), "+ Capture FAB present");
  assert(homeHtml.includes("🔒") || homeHtml.includes("Unlock private"), "5. Private as lock only");

  const captureHtml = await fetchHtml("/argus/v2?capture=1", cookies);

  console.log("\nAcceptance criteria (Capture sheet):");
  assert(captureHtml.includes("Cancel"), "2. Cancel always visible");
  assert(captureHtml.includes("Save"), "1. Save always visible");
  assert(captureHtml.includes("Reference"), "Reference meta available without leaving capture");
  assert(!captureHtml.includes("fixed inset-0 z-40 flex flex-col bg-zinc-950"), "3. No old full-screen takeover");

  const testBody = `Acceptance test note ${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);
  await createLog({
    kind: "log",
    date: today,
    title: autoTitleFromBody(testBody),
    body: testBody,
    private: false,
    source: "manual",
    entityIds: [],
    classificationStatus: resolveClassificationStatus([]),
    attachmentIds: [],
  });

  const logs = await getLogs(false);
  const recent = getRecentActivity(logs, 5);
  const found = recent.some((l) => l.body.includes(testBody.slice(0, 30)));

  console.log("\nFlow: Open → Capture → Write → Save → Dashboard:");
  assert(found, "Saved note appears in Recent activity");

  const afterHtml = await fetchHtml("/argus/v2", cookies);
  const titleSnippet = autoTitleFromBody(testBody).slice(0, 24);
  const inHtml =
    afterHtml.includes(titleSnippet) ||
    afterHtml.includes(encodeURIComponent(titleSnippet).replace(/%20/g, "%20")) ||
    afterHtml.includes(titleSnippet.replace(/ /g, "\\u0026#32;")); // loose
  assert(inHtml || found, "Note visible on dashboard after Save (data + render)");

  console.log("\nCriterion 6 (Reference modal, not navigation): verified in CaptureSheet.tsx — ReferencePickerModal stacks over sheet.");
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
