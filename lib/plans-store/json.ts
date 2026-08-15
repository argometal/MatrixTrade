import { promises as fs } from "fs";
import path from "path";
import {
  formatPlanId,
  maxPlanIdNumber,
  PlanIdCollisionError,
} from "../plan-id";
import type { TradePlan } from "../plan-types";
import type { PlansStore } from "./types";

function plansFilePath(): string {
  return path.join(process.cwd(), "data", "plans.json");
}

function planIdSeqFilePath(): string {
  return path.join(process.cwd(), "data", "plan-id-seq.json");
}

/** Serialize allocate+insert for local JSON store (approx concurrency safety). */
let plansJsonChain: Promise<unknown> = Promise.resolve();

function withPlansJsonLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = plansJsonChain.then(fn, fn);
  plansJsonChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function readPlansJsonFile(): Promise<TradePlan[]> {
  try {
    const raw = await fs.readFile(plansFilePath(), "utf-8");
    const parsed = JSON.parse(raw) as TradePlan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writePlansJsonFile(plans: TradePlan[]): Promise<void> {
  const file = plansFilePath();
  const sorted = [...plans].sort((a, b) => a.id.localeCompare(b.id));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
}

async function readPlanIdHighWater(): Promise<number> {
  try {
    const raw = await fs.readFile(planIdSeqFilePath(), "utf-8");
    const parsed = JSON.parse(raw) as { highWater?: number };
    const n = Number(parsed?.highWater);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return 0;
    throw err;
  }
}

async function writePlanIdHighWater(n: number): Promise<void> {
  const file = planIdSeqFilePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    `${JSON.stringify({ highWater: n }, null, 2)}\n`,
    "utf-8"
  );
}

export function createJsonPlansStore(): PlansStore {
  return {
    readAll: readPlansJsonFile,
    async upsert(plan) {
      await withPlansJsonLock(async () => {
        const all = await readPlansJsonFile();
        const index = all.findIndex((row) => row.id === plan.id);
        if (index >= 0) all[index] = plan;
        else all.push(plan);
        await writePlansJsonFile(all);
        const n = maxPlanIdNumber([plan]);
        if (n > 0) {
          const hw = await readPlanIdHighWater();
          if (n > hw) await writePlanIdHighWater(n);
        }
      });
    },
    async upsertMany(plans) {
      if (plans.length === 0) return;
      await withPlansJsonLock(async () => {
        const all = await readPlansJsonFile();
        const byId = new Map(all.map((p) => [p.id, p]));
        for (const plan of plans) byId.set(plan.id, plan);
        await writePlansJsonFile([...byId.values()]);
        const n = maxPlanIdNumber(plans);
        if (n > 0) {
          const hw = await readPlanIdHighWater();
          if (n > hw) await writePlanIdHighWater(n);
        }
      });
    },
    async allocateNextPlanId() {
      return withPlansJsonLock(async () => {
        const all = await readPlansJsonFile();
        const fromRows = maxPlanIdNumber(all);
        const fromSeq = await readPlanIdHighWater();
        const next = Math.max(fromRows, fromSeq) + 1;
        await writePlanIdHighWater(next);
        return formatPlanId(next);
      });
    },
    async insert(plan) {
      await withPlansJsonLock(async () => {
        const all = await readPlansJsonFile();
        if (all.some((row) => row.id.toUpperCase() === plan.id.toUpperCase())) {
          throw new PlanIdCollisionError(plan.id);
        }
        all.push(plan);
        await writePlansJsonFile(all);
        const n = maxPlanIdNumber([plan]);
        if (n > 0) {
          const hw = await readPlanIdHighWater();
          if (n > hw) await writePlanIdHighWater(n);
        }
      });
    },
  };
}

/** Test helper: reset in-process lock chain (does not touch disk). */
export function __resetPlansJsonLockForTests(): void {
  plansJsonChain = Promise.resolve();
}
