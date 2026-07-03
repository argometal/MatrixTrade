import { promises as fs } from "fs";
import path from "path";
import type { Setup } from "./setup-types";

export type { Setup } from "./setup-types";
export { getSetupName } from "./setup-types";

const DEFAULT_SETUPS: Setup[] = [
  { id: "breakout", name: "Breakout pullback" },
  { id: "mean-reversion", name: "Mean reversion" },
  { id: "earnings", name: "Earnings play" },
  { id: "trend", name: "Trend follow" },
  { id: "other", name: "Other" },
];

export async function getSetups(): Promise<Setup[]> {
  const filePath = path.join(process.cwd(), "data", "setups.json");
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Setup[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // use defaults
  }
  return DEFAULT_SETUPS;
}
