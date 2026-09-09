require("./register-local-env.cjs");

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  buildCaseSnapshot,
  getCaseSnapshotRuntimeInfo,
  listAvailableCaseSnapshotIdentities,
} from "../lib/case-snapshot";

function unavailableSnapshot(caseId: string): string {
  return [
    "=== CASE SNAPSHOT ===",
    "",
    `CASE ID: ${caseId}`,
    "STATUS: UNAVAILABLE",
    "REASON: Case identity not found in current canonical Case universe.",
    "",
    "=== END CASE SNAPSHOT ===",
    "",
  ].join("\n");
}

function parseArgs(argv: string[]): {
  outDir: string;
  planIds: string[];
  allowLocal: boolean;
} {
  let outDir = path.join("artifacts", "case-snapshots");
  const planIds: string[] = [];
  let allowLocal = false;

  for (const arg of argv) {
    if (arg.startsWith("--out-dir=")) {
      const value = arg.slice("--out-dir=".length).trim();
      if (value) outDir = value;
      continue;
    }
    if (arg === "--allow-local") {
      allowLocal = true;
      continue;
    }
    if (arg === "--all") continue;
    planIds.push(arg.trim().toUpperCase());
  }

  return { outDir, planIds: planIds.filter(Boolean), allowLocal };
}

async function run() {
  const runtime = await getCaseSnapshotRuntimeInfo();
  const { outDir, planIds, allowLocal } = parseArgs(process.argv.slice(2));
  const universe = await listAvailableCaseSnapshotIdentities();
  const targetMap = new Map(
    universe.map((identity) => [identity.planId.toUpperCase(), identity])
  );
  const targets =
    planIds.length > 0
      ? planIds.map((caseId) => {
          const match = targetMap.get(caseId.toUpperCase());
          return (
            match ?? {
              caseId,
              planId: caseId,
              caseOrigin: "modern" as const,
              ticker: "UNKNOWN",
            }
          );
        })
      : universe;

  await fs.mkdir(outDir, { recursive: true });

  if (!runtime.supabaseBacked && !allowLocal) {
    const manifestPath = path.join(outDir, "manifest.json");
    const blocker = {
      generatedAt: runtime.generatedAt,
      outDir,
      runtime,
      status: "blocked",
      blocker:
        "Live Case snapshot export requires a supabase-backed runtime. Current runtime resolved to local/json stores; refusing to claim full MXT Case universe. Re-run with live Supabase env or pass --allow-local for an explicitly local export.",
      counts: {
        totalCases: universe.length,
        modernCases: universe.filter((item) => item.caseOrigin === "modern").length,
        historicalCases: universe.filter((item) => item.caseOrigin === "historical_trade").length,
      },
      files: [],
    };
    await fs.writeFile(`${manifestPath}`, `${JSON.stringify(blocker, null, 2)}\n`, "utf8");
    process.stderr.write(
      `Blocked: runtime is ${runtime.tradesStoreMode}, not supabase-backed.\nManifest: ${manifestPath}\n`
    );
    process.exitCode = 1;
    return;
  }

  const manifest: {
    generatedAt: string;
    outDir: string;
    runtime: typeof runtime;
    total: number;
    counts: { totalCases: number; modernCases: number; historicalCases: number };
    files: {
      caseId: string;
      planId: string;
      caseOrigin: "modern" | "historical_trade";
      ticker: string;
      file: string;
      status: "ok" | "unavailable";
    }[];
  } = {
    generatedAt: runtime.generatedAt,
    outDir,
    runtime,
    total: targets.length,
    counts: {
      totalCases: targets.length,
      modernCases: targets.filter((item) => item.caseOrigin === "modern").length,
      historicalCases: targets.filter((item) => item.caseOrigin === "historical_trade").length,
    },
    files: [],
  };

  for (const identity of targets) {
    const text =
      (await buildCaseSnapshot(identity.planId)) ??
      unavailableSnapshot(identity.planId);
    const status = text.includes("STATUS: UNAVAILABLE") ? "unavailable" : "ok";
    const safeId = identity.planId.replace(/[:\\/]/g, "_");
    const file = path.join(outDir, `${safeId}.case-snapshot.txt`);
    await fs.writeFile(file, `${text.endsWith("\n") ? text : `${text}\n`}`, "utf8");
    manifest.files.push({
      caseId: identity.caseId,
      planId: identity.planId,
      caseOrigin: identity.caseOrigin,
      ticker: identity.ticker,
      file,
      status,
    });
  }

  const manifestPath = path.join(outDir, "manifest.json");
  await fs.writeFile(`${manifestPath}`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  process.stdout.write(
    `Exported ${manifest.files.length} case snapshot file(s) to ${outDir}\nManifest: ${manifestPath}\n`
  );
}

void run();
