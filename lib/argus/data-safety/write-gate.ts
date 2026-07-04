import { promises as fs } from "fs";
import type { ArgusData } from "../types";
import {
  assertBackupExists,
  backupJournalFile,
  backupJournalJson,
  restoreJournalFromBackup,
} from "./backup";
import { countArgusData, isUnexpectedDrop, type WriteIntent } from "./counts";
import { isJournalWriteBlocked } from "./policy";

export class ArgusWriteBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgusWriteBlockedError";
  }
}

export class ArgusDataSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgusDataSafetyError";
  }
}

export interface WriteArgusOptions {
  intent?: WriteIntent;
  journalFile: string;
  /** When set, persist via this fn instead of filesystem rename. */
  cloudWrite?: (data: ArgusData) => Promise<void>;
  /** Current on-disk JSON for cloud backup snapshot (optional). */
  currentJsonForBackup?: string | null;
}

async function writeJournalFile(journalFile: string, data: ArgusData): Promise<void> {
  const tmp = `${journalFile}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, journalFile);
}

/**
 * Rule 0 write gate: backup → validate → write → count check → rollback on unexpected drop.
 */
export async function writeArgusSafe(data: ArgusData, options: WriteArgusOptions): Promise<void> {
  const intent = options.intent ?? "mutation";

  if (intent !== "bootstrap" && isJournalWriteBlocked()) {
    throw new ArgusWriteBlockedError(
      "ARGUS journal writes are blocked on ephemeral storage. Set ARGUS_JOURNAL_STORE=supabase on Vercel."
    );
  }

  let beforeCounts = countArgusData({ entities: [], logs: [], inboxItems: [], attachments: [], version: 3 });
  let backupPath = "";

  if (options.cloudWrite) {
    const priorJson = options.currentJsonForBackup;
    if (priorJson) {
      try {
        const prior = JSON.parse(priorJson) as ArgusData;
        beforeCounts = countArgusData(prior);
      } catch {
        /* treat as empty prior */
      }
      backupPath = await backupJournalJson(priorJson);
    } else {
      backupPath = "";
      beforeCounts = countArgusData({ entities: [], logs: [], inboxItems: [], attachments: [], version: 3 });
    }
  } else {
    try {
      const raw = await fs.readFile(options.journalFile, "utf-8");
      beforeCounts = countArgusData(JSON.parse(raw) as ArgusData);
      backupPath = await backupJournalFile(options.journalFile);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw err;
    }
  }

  if (backupPath) {
    await assertBackupExists(backupPath);
  }

  try {
    if (options.cloudWrite) {
      await options.cloudWrite(data);
    } else {
      await writeJournalFile(options.journalFile, data);
    }
  } catch (err) {
    if (backupPath && !options.cloudWrite) {
      await restoreJournalFromBackup(backupPath, options.journalFile).catch(() => {});
    }
    throw err;
  }

  const afterCounts = countArgusData(data);
  if (isUnexpectedDrop(beforeCounts, afterCounts, intent)) {
    if (options.cloudWrite && backupPath) {
      const { restoreJournalToSupabase } = await import("../journal-store/supabase");
      const raw = await fs.readFile(backupPath, "utf-8");
      await restoreJournalToSupabase(raw).catch(() => {});
    } else if (backupPath) {
      await restoreJournalFromBackup(backupPath, options.journalFile).catch(() => {});
    }
    throw new ArgusDataSafetyError(
      `ARGUS write rolled back: record count dropped (${JSON.stringify(beforeCounts)} → ${JSON.stringify(afterCounts)})`
    );
  }
}
