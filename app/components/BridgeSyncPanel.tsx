import { syncBridgeFormAction } from "@/app/actions";
import { getBridgeConfig } from "@/lib/bridge";

export function BridgeSyncPanel({
  syncOk,
  syncError,
}: {
  syncOk?: string;
  syncError?: string;
}) {
  const config = getBridgeConfig();

  if (!config.configured) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        <h2 className="font-semibold text-zinc-800">Cloud bridge</h2>
        <p className="mt-1">
          Add <code className="rounded bg-white px-1">BRIDGE_WRITE_TOKEN</code> and{" "}
          <code className="rounded bg-white px-1">BRIDGE_READ_TOKEN</code> to{" "}
          <code className="rounded bg-white px-1">.env.local</code> (same values as{" "}
          <code className="rounded bg-white px-1">bridge/.dev.vars</code>) to publish snapshots
          for external assistants and phone QR.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      {syncOk && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          ✓ {decodeURIComponent(syncOk)}
        </div>
      )}
      {syncError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ✗ Sync failed — {decodeURIComponent(syncError)}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Cloud bridge
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Publish cycle state to Worker so assistants read{" "}
            <code className="text-xs">GET /snapshot</code> without copy/paste.
          </p>
        </div>
        <form action={syncBridgeFormAction}>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Sync to Worker
          </button>
        </form>
      </div>
    </section>
  );
}
