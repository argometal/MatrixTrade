import { promises as fs } from "fs";
import path from "path";
import type { TradePlan } from "../plan-types";
import type { PlansStore } from "./types";

const PLANS_FILE = path.join(process.cwd(), "data", "plans.json");

export async function readPlansJsonFile(): Promise<TradePlan[]> {
  try {
    const raw = await fs.readFile(PLANS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as TradePlan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writePlansJsonFile(plans: TradePlan[]): Promise<void> {
  const sorted = [...plans].sort((a, b) => a.id.localeCompare(b.id));
  await fs.mkdir(path.dirname(PLANS_FILE), { recursive: true });
  await fs.writeFile(PLANS_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
}

export function createJsonPlansStore(): PlansStore {
  return {
    readAll: readPlansJsonFile,
    async upsert(plan) {
      const all = await readPlansJsonFile();
      const index = all.findIndex((row) => row.id === plan.id);
      if (index >= 0) all[index] = plan;
      else all.push(plan);
      await writePlansJsonFile(all);
    },
    async upsertMany(plans) {
      const all = await readPlansJsonFile();
      const byId = new Map(all.map((p) => [p.id, p]));
      for (const plan of plans) byId.set(plan.id, plan);
      await writePlansJsonFile([...byId.values()]);
    },
  };
}
