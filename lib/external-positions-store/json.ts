import { promises as fs } from "fs";
import path from "path";
import type { ExternalPosition } from "../external-position-types";
import type { ExternalPositionsStore } from "./types";

const FILE = path.join(process.cwd(), "data", "external-positions.json");

/** Serialize JSON mutations to reduce lost updates in local single-process use. */
let writeChain: Promise<void> = Promise.resolve();

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

async function writeAll(all: ExternalPosition[]): Promise<void> {
  all.sort((a, b) => a.id.localeCompare(b.id));
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, `${JSON.stringify(all, null, 2)}\n`, "utf-8");
}

export function createJsonExternalPositionsStore(): ExternalPositionsStore {
  return {
    readAll: readExternalPositionsJsonFile,
    async upsert(row) {
      return this.upsertIfRevision(row, row.revision);
    },
    async upsertIfRevision(row, expectedRevision) {
      assertJsonExternalPositionWritesAllowed();
      const run = writeChain.then(async () => {
        const all = await readExternalPositionsJsonFile();
        const idx = all.findIndex(
          (x) => x.id.toUpperCase() === row.id.toUpperCase()
        );
        if (idx >= 0 && all[idx].revision !== expectedRevision) {
          throw new Error(
            `external_position_revision_conflict ${row.id}: expected ${expectedRevision}, found ${all[idx].revision}`
          );
        }
        const next: ExternalPosition = {
          ...row,
          experimentEligible: false,
          scoutLinked: false,
          revision: idx >= 0 ? all[idx].revision + 1 : 1,
          reductions: [...(row.reductions ?? [])],
        };
        if (idx >= 0) all[idx] = next;
        else all.push(next);
        await writeAll(all);
        return next;
      });
      writeChain = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    },
  };
}

export const EXTERNAL_POSITIONS_JSON_PATH = FILE;
