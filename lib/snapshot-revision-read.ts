import { promises as fs } from "fs";
import path from "path";

const REVISION_FILE = path.join(process.cwd(), "data", "snapshot-revision.json");

export async function getSnapshotRevisionState(): Promise<{
  revision: number;
  updatedAt: string;
} | null> {
  try {
    const raw = await fs.readFile(REVISION_FILE, "utf-8");
    const data = JSON.parse(raw) as { revision?: number; updatedAt?: string };
    if (typeof data.revision !== "number") return null;
    return {
      revision: data.revision,
      updatedAt: data.updatedAt ?? "—",
    };
  } catch {
    return null;
  }
}
