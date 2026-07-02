import { promises as fs } from "fs";
import path from "path";
import type { ArgusStoragePaths } from "./paths";
import { getArgusStoragePaths, isExternalDataRoot } from "./paths";

export interface StorageMeta {
  schema: 1;
  root: string;
  external: boolean;
  createdAt: string;
  migratedAt?: string;
  migratedFrom?: string;
}

let readyPromise: Promise<void> | null = null;

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeStorageMeta(paths: ArgusStoragePaths, extra?: Partial<StorageMeta>): Promise<void> {
  await fs.mkdir(paths.metaDir, { recursive: true });
  const meta: StorageMeta = {
    schema: 1,
    root: paths.root,
    external: isExternalDataRoot(),
    createdAt: new Date().toISOString(),
    ...extra,
  };
  await fs.writeFile(paths.storageMetaFile, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
}

async function copyLegacyRepoData(paths: ArgusStoragePaths): Promise<boolean> {
  const legacyJournal = path.join(paths.legacyRepoDataDir, "journal.json");
  const targetHasJournal = await exists(paths.journalFile);
  const legacyHasJournal = await exists(legacyJournal);

  if (!legacyHasJournal || targetHasJournal) return false;

  const sameRoot =
    path.resolve(paths.root) === path.resolve(paths.legacyRepoDataDir);
  if (sameRoot) return false;

  await fs.mkdir(paths.root, { recursive: true });
  await fs.copyFile(legacyJournal, paths.journalFile);

  const legacyFiles = path.join(paths.legacyRepoDataDir, "files");
  if (await exists(legacyFiles)) {
    await fs.mkdir(paths.filesDir, { recursive: true });
    await fs.cp(legacyFiles, paths.filesDir, { recursive: true });
  }

  await writeStorageMeta(paths, {
    migratedAt: new Date().toISOString(),
    migratedFrom: paths.legacyRepoDataDir,
  });
  return true;
}

async function ensureStorageReadyInternal(): Promise<void> {
  const paths = getArgusStoragePaths();

  await fs.mkdir(paths.root, { recursive: true });
  await fs.mkdir(paths.filesDir, { recursive: true });
  await fs.mkdir(paths.metaDir, { recursive: true });
  await fs.mkdir(paths.emailCacheDir, { recursive: true });
  await fs.mkdir(paths.annotationsDir, { recursive: true });
  await fs.mkdir(paths.backupsDir, { recursive: true });

  await copyLegacyRepoData(paths);

  if (!(await exists(paths.storageMetaFile))) {
    await writeStorageMeta(paths);
  }
}

/** Idempotent boot: create layout, migrate repo data/argus → ARGUS_DATA_DIR once. */
export async function ensureArgusStorageReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = ensureStorageReadyInternal();
  }
  await readyPromise;
}

export async function readStorageMeta(): Promise<StorageMeta | null> {
  const paths = getArgusStoragePaths();
  try {
    const raw = await fs.readFile(paths.storageMetaFile, "utf-8");
    return JSON.parse(raw) as StorageMeta;
  } catch {
    return null;
  }
}
