import { promises as fs } from "fs";
import path from "path";
import type { ThesisT0Freeze } from "../thesis-t0-types";
import type { ThesisT0Store } from "./types";

function thesisT0JsonPath(): string {
  return path.join(process.cwd(), "data", "thesis-t0-freezes.json");
}

function assertJsonWritesAllowed(): void {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error(
      "Thesis T0 JSON store cannot write on Vercel. Local-only for Prompt #8; cloud twin deferred."
    );
  }
}

async function readAllFile(): Promise<ThesisT0Freeze[]> {
  try {
    const raw = await fs.readFile(thesisT0JsonPath(), "utf-8");
    const parsed = JSON.parse(raw) as ThesisT0Freeze[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writeAllFile(rows: ThesisT0Freeze[]): Promise<void> {
  assertJsonWritesAllowed();
  await fs.mkdir(path.dirname(thesisT0JsonPath()), { recursive: true });
  await fs.writeFile(thesisT0JsonPath(), JSON.stringify(rows, null, 2), "utf-8");
}

export function createJsonThesisT0Store(): ThesisT0Store {
  return {
    async readAll() {
      return readAllFile();
    },
    async getById(id) {
      const all = await readAllFile();
      return all.find((r) => r.id.toUpperCase() === id.toUpperCase()) ?? null;
    },
    async findOpenByStockThesisId(stockThesisId) {
      const id = stockThesisId.toUpperCase();
      const all = await readAllFile();
      return (
        all.find(
          (r) => r.status === "open" && r.stockThesisId.toUpperCase() === id
        ) ?? null
      );
    },
    async insert(row) {
      const all = await readAllFile();
      if (all.some((r) => r.id.toUpperCase() === row.id.toUpperCase())) {
        throw new Error(`Thesis T0 freeze already exists: ${row.id}`);
      }
      all.push(row);
      await writeAllFile(all);
    },
    async upsert(row) {
      const all = await readAllFile();
      const idx = all.findIndex((r) => r.id.toUpperCase() === row.id.toUpperCase());
      if (idx >= 0) all[idx] = row;
      else all.push(row);
      await writeAllFile(all);
    },
  };
}
