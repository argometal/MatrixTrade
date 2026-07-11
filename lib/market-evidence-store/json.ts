import { promises as fs } from "fs";
import path from "path";
import type { MarketEvidence } from "../market-evidence-types";
import type { MarketEvidenceStore } from "./types";

const EVIDENCE_FILE = path.join(process.cwd(), "data", "market-evidence.json");

export async function readMarketEvidenceJsonFile(): Promise<MarketEvidence[]> {
  try {
    const raw = await fs.readFile(EVIDENCE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as MarketEvidence[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writeMarketEvidenceJsonFile(rows: MarketEvidence[]): Promise<void> {
  const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  await fs.mkdir(path.dirname(EVIDENCE_FILE), { recursive: true });
  await fs.writeFile(EVIDENCE_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
}

export function createJsonMarketEvidenceStore(): MarketEvidenceStore {
  return {
    readAll: readMarketEvidenceJsonFile,
    async append(evidence) {
      const all = await readMarketEvidenceJsonFile();
      all.push(evidence);
      await writeMarketEvidenceJsonFile(all);
    },
    async upsert(evidence) {
      const all = await readMarketEvidenceJsonFile();
      const index = all.findIndex((row) => row.id === evidence.id);
      if (index >= 0) all[index] = evidence;
      else all.push(evidence);
      await writeMarketEvidenceJsonFile(all);
    },
  };
}
