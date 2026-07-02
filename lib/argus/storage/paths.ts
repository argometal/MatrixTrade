import path from "path";

/**
 * ARGUS storage root. Set ARGUS_DATA_DIR in .env.local to keep user data outside the repo.
 * Falls back to {cwd}/data/argus for backward compatibility when unset.
 */
export function getArgusDataRoot(): string {
  const configured = process.env.ARGUS_DATA_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data", "argus");
}

export interface ArgusStoragePaths {
  root: string;
  journalFile: string;
  filesDir: string;
  metaDir: string;
  storageMetaFile: string;
  /** Repo-relative legacy location (pre ARGUS_DATA_DIR) */
  legacyRepoDataDir: string;
  legacyHealthVaultDir: string;
  legacyVaultFile: string;
  /** Reserved for future phases — directories created on first boot */
  emailCacheDir: string;
  annotationsDir: string;
  backupsDir: string;
}

export function getArgusStoragePaths(): ArgusStoragePaths {
  const root = getArgusDataRoot();
  const cwd = process.cwd();
  return {
    root,
    journalFile: path.join(root, "journal.json"),
    filesDir: path.join(root, "files"),
    metaDir: path.join(root, "meta"),
    storageMetaFile: path.join(root, "meta", "storage.json"),
    legacyRepoDataDir: path.join(cwd, "data", "argus"),
    legacyHealthVaultDir: path.join(cwd, "data", "health-vault"),
    legacyVaultFile: path.join(cwd, "data", "health-vault", "vault.json"),
    emailCacheDir: path.join(root, "email-cache"),
    annotationsDir: path.join(root, "annotations"),
    backupsDir: path.join(root, "backups"),
  };
}

/** True when user data is outside the repository tree */
export function isExternalDataRoot(): boolean {
  const paths = getArgusStoragePaths();
  const repoRoot = path.resolve(process.cwd());
  const dataRoot = path.resolve(paths.root);
  return !dataRoot.startsWith(repoRoot + path.sep) && dataRoot !== repoRoot;
}
