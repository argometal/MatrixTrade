import { readFile, writeFile } from "fs/promises";
import path from "path";
import type { AppliedImportRecord, AppliedImportResult, AppliedImportStore } from "./types";

const FILE = path.join(process.cwd(), "data", "applied-import-fingerprints.json");

async function readRecords(): Promise<AppliedImportRecord[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppliedImportRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeRecords(records: AppliedImportRecord[]): Promise<void> {
  await writeFile(FILE, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

export function createJsonAppliedImportStore(): AppliedImportStore {
  return {
    async findByFingerprint(fingerprint) {
      const records = await readRecords();
      return records.find((r) => r.fingerprint === fingerprint) ?? null;
    },
    async record(fingerprint, result) {
      const records = await readRecords();
      const existing = records.find((r) => r.fingerprint === fingerprint);
      if (existing) return existing;
      const row: AppliedImportRecord = {
        fingerprint,
        appliedAt: new Date().toISOString(),
        result,
      };
      records.push(row);
      await writeRecords(records);
      return row;
    },
  };
}
