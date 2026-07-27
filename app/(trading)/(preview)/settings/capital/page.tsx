import { promises as fs } from "fs";
import path from "path";
import { CapitalSettingsPanel } from "@/app/components/settings/CapitalSettingsPanel";
import { getCapitalAccountSnapshot } from "@/lib/capital-account";
import { getActiveCapitalConfiguration } from "@/lib/capital-configuration";

export type LoadResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

async function settleLoad<T>(promise: Promise<T>): Promise<LoadResult<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function resolveStoreMode(): Promise<string> {
  const forced = process.env.CAPITAL_PLANNER_STORE?.trim().toLowerCase();
  if (forced) return forced;
  if (process.env.VERCEL || process.env.VERCEL_ENV) return "supabase";
  return "json";
}

async function sqlFileAvailable(rel: string): Promise<boolean> {
  try {
    await fs.access(path.join(process.cwd(), rel));
    return true;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : "";
    if (code === "ENOENT") return false;
    throw err instanceof Error
      ? err
      : new Error(`SQL migration availability check failed for ${rel}`);
  }
}

async function sqlMigrationAvailable(): Promise<boolean> {
  return sqlFileAvailable("supabase/capital-planner.sql");
}

async function externalPositionsSqlAvailable(): Promise<boolean> {
  return sqlFileAvailable("supabase/external-positions.sql");
}

export default async function CapitalSettingsPage() {
  const [
    configurationResult,
    accountResult,
    storeModeResult,
    sqlResult,
    externalSqlResult,
  ] = await Promise.all([
    settleLoad(getActiveCapitalConfiguration()),
    settleLoad(getCapitalAccountSnapshot()),
    settleLoad(resolveStoreMode()),
    settleLoad(sqlMigrationAvailable()),
    settleLoad(externalPositionsSqlAvailable()),
  ]);

  return (
    <div className="h-full overflow-y-auto">
      <CapitalSettingsPanel
        configuration={
          configurationResult.ok ? configurationResult.value : null
        }
        configurationError={
          configurationResult.ok ? undefined : configurationResult.error
        }
        account={accountResult.ok ? accountResult.value : null}
        accountError={accountResult.ok ? undefined : accountResult.error}
        storeMode={storeModeResult.ok ? storeModeResult.value : undefined}
        storeModeError={
          storeModeResult.ok ? undefined : storeModeResult.error
        }
        sqlMigrationAvailable={sqlResult.ok ? sqlResult.value : undefined}
        sqlMigrationError={sqlResult.ok ? undefined : sqlResult.error}
        externalPositionsSqlAvailable={
          externalSqlResult.ok ? externalSqlResult.value : undefined
        }
        externalPositionsSqlError={
          externalSqlResult.ok ? undefined : externalSqlResult.error
        }
      />
    </div>
  );
}
