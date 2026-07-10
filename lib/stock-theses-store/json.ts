import { promises as fs } from "fs";
import path from "path";
import type { StockThesis } from "../stock-thesis-types";
import type { StockThesesStore } from "./types";

const THESES_FILE = path.join(process.cwd(), "data", "stock-theses.json");

export async function readStockThesesJsonFile(): Promise<StockThesis[]> {
  try {
    const raw = await fs.readFile(THESES_FILE, "utf-8");
    const parsed = JSON.parse(raw) as StockThesis[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writeStockThesesJsonFile(theses: StockThesis[]): Promise<void> {
  const sorted = [...theses].sort((a, b) => a.id.localeCompare(b.id));
  await fs.mkdir(path.dirname(THESES_FILE), { recursive: true });
  await fs.writeFile(THESES_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
}

export function createJsonStockThesesStore(): StockThesesStore {
  return {
    readAll: readStockThesesJsonFile,
    async upsert(thesis) {
      const all = await readStockThesesJsonFile();
      const index = all.findIndex((row) => row.id === thesis.id);
      if (index >= 0) all[index] = thesis;
      else all.push(thesis);
      await writeStockThesesJsonFile(all);
    },
    async upsertMany(theses) {
      const all = await readStockThesesJsonFile();
      const byId = new Map(all.map((t) => [t.id, t]));
      for (const thesis of theses) byId.set(thesis.id, thesis);
      await writeStockThesesJsonFile([...byId.values()]);
    },
  };
}
