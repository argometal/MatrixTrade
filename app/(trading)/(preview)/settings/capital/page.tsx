import { promises as fs } from "fs";
import path from "path";
import { CapitalSettingsPanel } from "@/app/components/settings/CapitalSettingsPanel";
import { getCapitalAccountSnapshot } from "@/lib/capital-account";
import { getActiveCapitalConfiguration } from "@/lib/capital-configuration";

async function resolveStoreMode(): Promise<string> {
  const forced = process.env.CAPITAL_PLANNER_STORE?.trim().toLowerCase();
  if (forced) return forced;
  if (process.env.VERCEL || process.env.VERCEL_ENV) return "supabase";
  return "json";
}

async function sqlMigrationAvailable(): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), "supabase", "capital-planner.sql"));
    return true;
  } catch {
    return false;
  }
}

export default async function CapitalSettingsPage() {
  const [configuration, accountResult, storeMode, sqlOk] = await Promise.all([
    getActiveCapitalConfiguration(),
    getCapitalAccountSnapshot().catch(() => null),
    resolveStoreMode(),
    sqlMigrationAvailable(),
  ]);

  return (
    <div className="h-full overflow-y-auto">
      <CapitalSettingsPanel
        configuration={configuration}
        account={accountResult}
        storeMode={storeMode}
        sqlMigrationAvailable={sqlOk}
      />
    </div>
  );
}
