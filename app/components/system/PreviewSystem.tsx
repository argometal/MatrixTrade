import Link from "next/link";
import { ConnectPageContent } from "@/app/components/ConnectPageContent";
import { CopyUrlButton } from "@/app/components/CopyUrlButton";
import { ImportAiUpdateLink } from "@/app/components/preview/ImportAiUpdateLink";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { SystemBridgePanel } from "@/app/components/system/SystemBridgePanel";
import { SystemRulesPanel } from "@/app/components/system/SystemRulesPanel";
import { SystemSection, SystemRow, StatusBadge } from "@/app/components/system/SystemSection";
import type { SystemPageData } from "@/lib/system-page-data";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

const SECTION_LINKS = [
  { id: "rules", label: "Rules" },
  { id: "bridge", label: "Bridge" },
  { id: "connect", label: "Connect" },
  { id: "knowledge", label: "Knowledge" },
  { id: "meta", label: "System" },
] as const;

export function PreviewSystem({
  data,
  syncOk,
  syncError,
  mechanicsSnapshot,
}: {
  data: SystemPageData;
  syncOk?: string;
  syncError?: string;
  mechanicsSnapshot: SnapshotMenuItem[];
}) {
  const {
    bridge,
    isVercel,
    env,
    buildLabel,
    vercelUrl,
    version,
    tradesStore,
    inboxBackend,
    pendingInboxCount,
    snapshotUrl,
    workerStatus,
    tokenFlags,
    history,
    vault,
    lastNote,
    lastReview,
    localRevision,
    localUpdatedAt,
    rules,
  } = data;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">System</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Bridge sync, inbox backend, vault paths, and deployment status.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SnapshotButton
                title="Matrix Mechanics snapshot"
                description="Full rules, block types, Apply gate — paste once per AI session"
                items={mechanicsSnapshot}
              />
              <ImportAiUpdateLink variant="compact" />
              <Link
                href="/home-preview?panel=assistant"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              >
                Asistente IA
              </Link>
              {pendingInboxCount > 0 && (
                <Link
                  href="/inbox"
                  className="rounded-lg bg-violet-600/20 px-3 py-2 text-xs font-medium text-violet-300 hover:bg-violet-600/30"
                >
                  Inbox ({pendingInboxCount})
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-violet-500/20 bg-violet-950/30 px-4 py-3 text-sm text-violet-200">
            Sync snapshot to Worker before using{" "}
            <Link href="/home-preview?panel=assistant" className="font-medium text-violet-300 underline hover:text-violet-200">
              Asistente IA
            </Link>
            .
          </div>

          <nav className="mt-4 flex flex-wrap gap-2">
            {SECTION_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </header>

        <div className="space-y-6 px-4 py-6 lg:px-6">
          <SystemSection
            id="rules"
            title="Experiment rules"
            description="Monthly loss cap (account protection) and experiment sample size."
          >
            <SystemRulesPanel rules={rules} />
          </SystemSection>

          <SystemSection
            id="bridge"
            title="Bridge"
            description="Cloudflare Worker — publish experiment snapshot for Assistant and mobile."
          >
            <SystemBridgePanel
              syncOk={syncOk}
              syncError={syncError}
              workerReachable={workerStatus.reachable}
              workerHttpStatus={workerStatus.httpStatus}
              workerUpdatedAt={workerStatus.updatedAt}
              workerRevision={workerStatus.snapshotRevision}
              workerError={workerStatus.error}
              localRevision={localRevision}
              localUpdatedAt={localUpdatedAt}
              history={history}
              isVercel={isVercel}
            />

            {snapshotUrl && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Cloud snapshot URL
                </h3>
                <p className="mt-2 break-all font-mono text-xs text-zinc-400">{snapshotUrl}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={snapshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                  >
                    Open snapshot
                  </a>
                  <CopyUrlButton url={snapshotUrl} label="Copy snapshot URL" variant="dark" />
                </div>
              </div>
            )}
          </SystemSection>

          <SystemSection
            id="connect"
            title="Connect"
            description={
              isVercel
                ? "Phone LAN access — available when running MatrixTrade locally."
                : "Local WiFi access to full MatrixTrade UI."
            }
          >
            <SystemRow
              label="Inbox backend"
              value={<span className="font-mono text-xs text-zinc-300">{inboxBackend}</span>}
            />
            <SystemRow
              label="Inbox (pending)"
              value={
                pendingInboxCount === 0 ? (
                  "None"
                ) : (
                  <Link href="/inbox" className="text-violet-400 hover:text-violet-300 hover:underline">
                    {pendingInboxCount} pending · open Inbox
                  </Link>
                )
              }
            />
            <SystemRow
              label="Trades store"
              value={<span className="font-mono text-xs text-zinc-300">{tradesStore}</span>}
            />

            {isVercel ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
                LAN QR codes require a local dev server. On Vercel, use this deployment URL
                {vercelUrl ? (
                  <>
                    {" "}
                    (<span className="font-mono text-xs">{vercelUrl}</span>)
                  </>
                ) : null}{" "}
                or run <code className="text-xs">npm run dev</code> on your PC for WiFi QR.
              </div>
            ) : (
              <details className="rounded-lg border border-zinc-800 bg-zinc-900/30" open>
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300">
                  Connect phone — local WiFi QR
                </summary>
                <div className="border-t border-zinc-800 p-4">
                  <p className="mb-4 text-sm text-zinc-500">Same WiFi — full app UI on LAN.</p>
                  <ConnectPageContent />
                </div>
              </details>
            )}

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
              <h3 className="font-medium text-zinc-200">Local inbox API</h3>
              <pre className="mt-2 overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                {`POST /api/trading/inbox\nAuthorization: Bearer <MATRIXTRADE_INBOX_TOKEN>`}
              </pre>
              <p className="mt-2 text-zinc-400">
                Token configured:{" "}
                <StatusBadge ok={tokenFlags.inboxToken} label={tokenFlags.inboxToken ? "Yes" : "No"} />
              </p>
            </div>
          </SystemSection>

          <SystemSection id="knowledge" title="Knowledge" description="Obsidian vault and trade notes.">
            {isVercel ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
                Obsidian vault paths are local-only. Production uses{" "}
                <span className="font-mono text-zinc-300">{tradesStore}</span> for trade data.
              </div>
            ) : null}
            <dl className="space-y-3">
              <SystemRow label="Obsidian vault" value={vault.vaultName} />
              <SystemRow label="Vault path" value={vault.vaultPath} mono />
              <SystemRow label="Trades folder" value={`${vault.tradesFolder}/`} />
              <SystemRow
                label="Vault ready"
                value={
                  isVercel ? (
                    <span className="text-zinc-500">N/A on Vercel</span>
                  ) : (
                    <StatusBadge ok={vault.ready} label={vault.ready ? "Found" : "Missing"} />
                  )
                }
              />
              <SystemRow
                label="Last note written"
                value={
                  isVercel
                    ? "—"
                    : lastNote.mtime
                      ? new Date(lastNote.mtime).toLocaleString()
                      : "—"
                }
              />
              <SystemRow
                label="Last review exported"
                value={
                  lastReview.reviewedAt
                    ? `${lastReview.tradeId} · ${new Date(lastReview.reviewedAt).toLocaleString()}`
                    : "—"
                }
              />
              <SystemRow label="Data file" value={vault.dataFile} mono />
            </dl>
          </SystemSection>

          <SystemSection id="meta" title="System" description="Version, environment, tokens.">
            <dl className="space-y-3">
              <SystemRow label="Version" value={`MatrixTrade v${version}`} />
              <SystemRow label="Build" value={buildLabel} mono />
              <SystemRow label="Environment" value={env} />
              <SystemRow label="Worker URL" value={bridge.url} mono />
              <SystemRow
                label="Worker reachable"
                value={
                  tokenFlags.bridgeRead ? (
                    <StatusBadge
                      ok={workerStatus.reachable}
                      label={workerStatus.reachable ? "Reachable" : "Unreachable"}
                    />
                  ) : (
                    <span className="text-zinc-500">Configure BRIDGE_READ_TOKEN</span>
                  )
                }
              />
            </dl>

            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Tokens configured
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between gap-4">
                  <span className="font-mono text-xs text-zinc-400">BRIDGE_WRITE_TOKEN</span>
                  <StatusBadge ok={tokenFlags.bridgeWrite} />
                </li>
                <li className="flex justify-between gap-4">
                  <span className="font-mono text-xs text-zinc-400">BRIDGE_READ_TOKEN</span>
                  <StatusBadge ok={tokenFlags.bridgeRead} />
                </li>
                <li className="flex justify-between gap-4">
                  <span className="font-mono text-xs text-zinc-400">MATRIXTRADE_INBOX_TOKEN</span>
                  <StatusBadge ok={tokenFlags.inboxToken} />
                </li>
                <li className="flex justify-between gap-4">
                  <span className="font-mono text-xs text-zinc-400">MATRIXTRADE_PASSWORD</span>
                  <StatusBadge ok={tokenFlags.tradingPassword} />
                </li>
              </ul>
              <p className="mt-3 text-xs text-zinc-600">Values are never displayed.</p>
            </div>
          </SystemSection>
        </div>
      </div>
    </div>
  );
}
