"use client";

import { CopyUrlButton } from "@/app/components/CopyUrlButton";
import { ShowQrPanel } from "@/app/components/system/ShowQrPanel";
import { AI_WORKFLOW_STEPS, getAssistantWebUrl } from "@/lib/ai-workspace";

export function QuickConnectPanel({
  snapshotUrl,
  snapshotQrDataUrl,
  snapshotRevision,
  snapshotUpdatedAt,
  bridgeConfigured,
  workerReachable,
}: {
  snapshotUrl: string | null;
  snapshotQrDataUrl: string | null;
  snapshotRevision: number | null;
  snapshotUpdatedAt: string | null;
  bridgeConfigured: boolean;
  workerReachable: boolean;
}) {
  const assistantUrl = getAssistantWebUrl();
  const ready = Boolean(snapshotUrl && bridgeConfigured && workerReachable);

  return (
    <div className="space-y-5">
      <dl className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-xs font-medium uppercase text-zinc-400">Snapshot</dt>
          <dd className="text-right text-zinc-700">
            {!bridgeConfigured ? (
              "Configure bridge in System"
            ) : !workerReachable ? (
              "Sync to Worker first"
            ) : (
              <>
                {snapshotRevision !== null ? `#${snapshotRevision}` : "—"}
                {snapshotUpdatedAt && (
                  <span className="block text-xs text-zinc-500">{snapshotUpdatedAt}</span>
                )}
              </>
            )}
          </dd>
        </div>
      </dl>

      {!ready ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Go to <strong>System → Bridge</strong>, configure tokens, then <strong>Sync to Worker</strong>.
          Quick Connect activates after a successful sync.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              1 · Snapshot URL
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Full Worker URL — paste in any assistant or browser.
            </p>
            <CopyUrlButton url={snapshotUrl!} label="Copy Snapshot URL" />
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              2 · QR
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Same Worker URL — scan from phone (opens JSON in browser).
            </p>
            {snapshotQrDataUrl && (
              <ShowQrPanel
                qrDataUrl={snapshotQrDataUrl}
                caption="Worker snapshot (read-only)"
                url={snapshotUrl!}
              />
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              3 · Assistant
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Open your assistant — you choose the provider.
            </p>
            <a
              href={assistantUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block w-full rounded-md bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-zinc-800"
            >
              Open Assistant
            </a>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Workflow</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-zinc-700">
          {AI_WORKFLOW_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
