import { promises as fs } from "fs";
import path from "path";

const REVISION_FILE = path.join(process.cwd(), "data", "snapshot-revision.json");

export async function nextSnapshotRevision(): Promise<number> {
  let revision = 0;
  try {
    const raw = await fs.readFile(REVISION_FILE, "utf-8");
    const data = JSON.parse(raw) as { revision?: number };
    if (typeof data.revision === "number" && Number.isFinite(data.revision)) {
      revision = data.revision;
    }
  } catch {
    // first sync
  }

  revision += 1;
  await fs.writeFile(
    REVISION_FILE,
    JSON.stringify({ revision, updatedAt: new Date().toISOString() }, null, 2) + "\n",
    "utf-8"
  );
  return revision;
}
