import { promises as fs } from "fs";
import path from "path";
import { getArgusStoragePaths } from "../storage/paths";

const MAX_BACKUPS = 20;

function backupFileName(iso: string): string {
  return `journal-${iso.replace(/[:.]/g, "-")}.json`;
}

export async function backupJournalFile(sourcePath: string): Promise<string> {
  const paths = getArgusStoragePaths();
  await fs.mkdir(paths.backupsDir, { recursive: true });

  let raw: string;
  try {
    raw = await fs.readFile(sourcePath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return "";
    }
    throw err;
  }

  const stamp = new Date().toISOString();
  const dest = path.join(paths.backupsDir, backupFileName(stamp));
  await fs.writeFile(dest, raw, "utf-8");
  await rotateBackups(paths.backupsDir);
  return dest;
}

export async function backupJournalJson(json: string): Promise<string> {
  const paths = getArgusStoragePaths();
  await fs.mkdir(paths.backupsDir, { recursive: true });
  const stamp = new Date().toISOString();
  const dest = path.join(paths.backupsDir, backupFileName(stamp));
  await fs.writeFile(dest, json, "utf-8");
  await rotateBackups(paths.backupsDir);
  return dest;
}

async function rotateBackups(backupsDir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(backupsDir);
  } catch {
    return;
  }
  const files = entries
    .filter((f) => f.startsWith("journal-") && f.endsWith(".json"))
    .sort()
    .reverse();
  for (const file of files.slice(MAX_BACKUPS)) {
    await fs.unlink(path.join(backupsDir, file)).catch(() => {});
  }
}

export async function assertBackupExists(backupPath: string): Promise<void> {
  if (!backupPath) return;
  await fs.access(backupPath);
}

export async function restoreJournalFromBackup(backupPath: string, targetPath: string): Promise<void> {
  const raw = await fs.readFile(backupPath, "utf-8");
  const tmp = `${targetPath}.restore.tmp`;
  await fs.writeFile(tmp, raw, "utf-8");
  await fs.rename(tmp, targetPath);
}
