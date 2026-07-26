import { promises as fs } from "fs";
import path from "path";
import type { ExternalPosition } from "../external-position-types";
import type { ExternalPositionsStore } from "./types";

const FILE = path.join(process.cwd(), "data", "external-positions.json");

export function assertJsonExternalPositionWritesAllowed(): void {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error(
      "External Position JSON store cannot write on Vercel (read-only filesystem). " +
        "Use Supabase public.external_positions — run supabase/external-positions.sql."
    );
  }
}

export async function readExternalPositionsJsonFile(): Promise<
  ExternalPosition[]
> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw) as ExternalPosition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

export function createJsonExternalPositionsStore(): ExternalPositionsStore {
  return {
    readAll: readExternalPositionsJsonFile,
    async upsert(row) {
      assertJsonExternalPositionWritesAllowed();
      const all = await readExternalPositionsJsonFile();
      const next = {
        ...row,
        experimentEligible: false as const,
        scoutLinked: false as const,
      };
      const idx = all.findIndex(
        (x) => x.id.toUpperCase() === next.id.toUpperCase()
      );
      if (idx >= 0) all[idx] = next;
      else all.push(next);
      all.sort((a, b) => a.id.localeCompare(b.id));
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, `${JSON.stringify(all, null, 2)}\n`, "utf-8");
      return next;
    },
  };
}

export const EXTERNAL_POSITIONS_JSON_PATH = FILE;
