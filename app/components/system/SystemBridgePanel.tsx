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
  localRevision,
  localUpdatedAt,
  history,
}: {
  syncOk?: string;
  syncError?: string;
  workerReachable: boolean;
  workerHttpStatus?: number;
  workerUpdatedAt?: string;
  workerRevision?: number;
  localRevision: number | null;
  localUpdatedAt: string | null;
  history: SyncHistoryEntry[];
}) {
  const bridge = getBridgeConfig();

  return (
    <div className="space-y-4">
      {syncOk && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          ✓ {decodeURIComponent(syncOk)}
        </div>
      )}
      {syncError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ✗ Sync failed — {decodeURIComponent(syncError)}
        </div>
      )}

      <dl className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
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
        {workerHttpStatus !== undefined && (
          <SystemRow label="Worker HTTP" value={String(workerHttpStatus)} />
        )}
        <SystemRow
          label="Snapshot revision"
          value={
            localRevision !== null
              ? `#${localRevision}${workerRevision !== undefined ? ` (Worker: #${workerRevision})` : ""}`
              : "—"
          }
        />
        <SystemRow
          label="Updated at"
          value={
            localUpdatedAt
              ? `${localUpdatedAt}${workerUpdatedAt ? ` · Worker: ${workerUpdatedAt}` : ""}`
              : workerUpdatedAt ?? "—"
          }
        />
        <SystemRow label="Worker URL" value={bridge.url} mono />
      </dl>

      <form action={syncBridgeFormAction}>
        <button
          type="submit"
          disabled={!bridge.configured}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sync to Worker
        </button>
      </form>

      {!bridge.configured && (
        <p className="text-sm text-zinc-500">
          Set <code className="text-xs">BRIDGE_WRITE_TOKEN</code> and{" "}
          <code className="text-xs">BRIDGE_READ_TOKEN</code> in{" "}
          <code className="text-xs">.env.local</code>.
        </p>
      )}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Sync history</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">No syncs recorded yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm">
            {history.slice(0, 10).map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-zinc-600">
                  {new Date(entry.at).toLocaleString()}
                  {entry.snapshotRevision !== undefined && ` · rev ${entry.snapshotRevision}`}
                </span>
                <span className={entry.ok ? "text-emerald-600" : "text-red-600"}>
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
