/**
 * Rule 0 proof smoke test — backup gate, count check, persistence read-back.
 *
 * Usage:
 *   npx tsx tools/verify-argus-data-safety.ts
 *   npx tsx tools/verify-argus-data-safety.ts --write-test
 */
import { promises as fs } from "fs";
import path from "path";
import { countArgusData, getStorageSafetyStatus } from "../lib/argus/data-safety";
import { getArgusStoragePaths } from "../lib/argus/storage/paths";
import {
  createEntity,
  createLog,
  getEntities,
  getLogs,
  getStorageDiagnostics,
  readArgus,
} from "../lib/argus/server-storage";

const WRITE_TEST = process.argv.includes("--write-test");

function pass(label: string): void {
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail?: string): never {
  console.error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  process.exit(1);
}

async function countBackups(): Promise<number> {
  const { backupsDir } = getArgusStoragePaths();
  try {
    const files = await fs.readdir(backupsDir);
    return files.filter((f) => f.startsWith("journal-") && f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

async function main(): Promise<void> {
  console.log("ARGUS Rule 0 — data safety verification\n");

  const safety = getStorageSafetyStatus();
  console.log("Storage:", JSON.stringify(safety, null, 2));

  if (safety.writesBlocked && WRITE_TEST) {
    fail("write test", "journal writes blocked on ephemeral storage");
  }

  const beforeEntities = (await getEntities()).length;
  const beforeLogs = (await getLogs(true)).length;
  const beforeBackups = await countBackups();

  if (WRITE_TEST) {
    const entity = await createEntity({
      type: "person",
      name: `Rule0 probe ${Date.now()}`,
      notes: "auto test",
      alias: "",
      strategicValue: 3,
    });
    await createLog({
      kind: "log",
      date: new Date().toISOString().slice(0, 10),
      title: "Rule 0 probe",
      body: "Automated data safety write test",
      entityIds: [entity.id],
      classificationStatus: "classified",
      private: false,
      source: "manual",
      attachmentIds: [],
      topics: ["rule0-test"],
    });

    const afterBackups = await countBackups();
    if (afterBackups <= beforeBackups) {
      fail("backup-before-write", `backup count ${beforeBackups} → ${afterBackups}`);
    }
    pass("backup created before write");

    const data = await readArgus();
    const counts = countArgusData(data);
    if (counts.entities < beforeEntities + 1 || counts.logs < beforeLogs + 1) {
      fail("count after write", JSON.stringify(counts));
    }
    pass("record counts increased after write");

    const reloaded = await readArgus();
    if (reloaded.entities.length !== data.entities.length || reloaded.logs.length !== data.logs.length) {
      fail("read-back after write");
    }
    pass("read-back matches after write (restart-safe read path)");
  } else {
    console.log("\nSkipping write test (pass --write-test to run mutations).\n");
  }

  const diag = await getStorageDiagnostics();
  if (!diag.safety) fail("storage diagnostics missing safety block");
  pass("storage diagnostics available");

  if (safety.journalStore === "supabase") {
    pass("cloud journal store enabled");
  } else if (safety.externalDataRoot && !safety.writesBlocked) {
    pass("external filesystem journal store");
  } else if (safety.writesBlocked) {
    console.log("\nWARN: journal writes blocked — set ARGUS_JOURNAL_STORE=supabase on Vercel.");
  }

  console.log("\nRule 0 verification complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
