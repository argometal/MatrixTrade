import path from "path";

/** Same on-disk layout as Argus meta/files (ARGUS_DATA_DIR) — Forge-owned lab data only. */
export function getTrainingLabDataRoot(): string {
  const configured = process.env.ARGUS_DATA_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "data", "argus");
}

export function getTrainingLabStoragePaths(): { metaDir: string; filesDir: string } {
  const root = getTrainingLabDataRoot();
  return {
    metaDir: path.join(root, "meta"),
    filesDir: path.join(root, "files"),
  };
}
