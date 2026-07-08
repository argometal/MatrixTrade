import { syncBridgeFormAction } from "@/app/actions";
import { getBridgeConfig } from "@/lib/bridge";
import type { SyncHistoryEntry } from "@/lib/sync-history";
import { StatusBadge, SystemRow } from "@/app/components/system/SystemSection";

export function SystemBridgePanel({
  syncOk,
  syncError,
  workerReachable,
  workerHttpStatus,
  workerUpdatedAt,
  workerRevision,
  workerError,
  localRevision,
  localUpdatedAt,
  history,
  isVercel = false,
}: {
  syncOk?: string;
  syncError?: string;
  workerReachable: boolean;
  workerHttpStatus?: number;
  workerUpdatedAt?: string;
  workerRevision?: number;
  workerError?: string;
  localRevision: number | null;
  localUpdatedAt: string | null;
  history: SyncHistoryEntry[];
  isVercel?: boolean;
}) {
  const bridge = getBridgeConfig();

  return (
    <div className="space-y-4">
      {syncOk && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          ✓ {decodeURIComponent(syncOk)}
        </div>
      )}
      {syncError && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          ✗ Sync failed — {decodeURIComponent(syncError)}
        </div>
      )}

      <dl className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <SystemRow
          label="Worker status"
          value={
            bridge.configured ? (
              <StatusBadge ok={workerReachable} label={workerReachable ? "Reachable" : "Unreachable"} />
            ) : (
              <span className="text-zinc-500">Not configured</span>
            )
          }
        />
        {!workerReachable && workerError && bridge.configured && (
          <SystemRow label="Worker detail" value={<span className="text-red-300">{workerError}</span>} />
        )}
        {workerHttpStatus !== undefined && (
          <SystemRow label="Worker HTTP" value={String(workerHttpStatus)} />
        )}
        <SystemRow
          label="Snapshot revision"
          value={
            localRevision !== null
              ? `#${localRevision}${workerRevision !== undefined ? ` · Worker #${workerRevision}` : ""}`
              : workerRevision !== undefined
                ? `Worker #${workerRevision}`
                : isVercel
                  ? "Worker-only on Vercel"
                  : "—"
          }
        />
        <SystemRow
          label="Updated at"
          value={
            localUpdatedAt
              ? `${localUpdatedAt}${workerUpdatedAt ? ` · Worker ${workerUpdatedAt}` : ""}`
              : workerUpdatedAt ?? "—"
          }
        />
        <SystemRow label="Worker URL" value={bridge.url} mono />
      </dl>

      <form action={syncBridgeFormAction}>
        <button
          type="submit"
          disabled={!bridge.configured}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sync to Worker
        </button>
      </form>

      {!bridge.configured && (
        <p className="text-sm text-zinc-500">
          Set <code className="text-xs text-zinc-400">BRIDGE_WRITE_TOKEN</code> and{" "}
          <code className="text-xs text-zinc-400">BRIDGE_READ_TOKEN</code> in Vercel env or{" "}
          <code className="text-xs text-zinc-400">.env.local</code>.
        </p>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sync history</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No syncs recorded yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-800 rounded-lg border border-zinc-800 text-sm">
            {history.slice(0, 10).map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-zinc-400">
                  {new Date(entry.at).toLocaleString()}
                  {entry.snapshotRevision !== undefined && ` · rev ${entry.snapshotRevision}`}
                </span>
                <span className={entry.ok ? "text-emerald-400" : "text-red-400"}>
                  {entry.ok ? `✓ HTTP ${entry.httpStatus ?? 200}` : `✗ ${entry.error ?? "failed"}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
