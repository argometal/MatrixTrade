import Link from "next/link";
import { SystemBridgePanel } from "@/app/components/system/SystemBridgePanel";
import { SystemSection, SystemRow, StatusBadge } from "@/app/components/system/SystemSection";
import { ConnectPageContent } from "@/app/components/ConnectPageContent";
import { fetchBridgeInbox } from "@/lib/bridge";
import { getSnapshotRevisionState } from "@/lib/snapshot-revision-read";
import { getSyncHistory } from "@/lib/sync-history";
import {
  checkWorkerReachable,
  getEnvironmentLabel,
  getLastNoteWritten,
  getLastReviewExported,
  getTokenFlags,
} from "@/lib/system-status";
import { listAllPendingInboxItems } from "@/lib/trading-inbox-storage";
import { getTrades, getVaultStatus, getRules } from "@/lib/storage";
import packageJson from "@/package.json";

const SECTION_LINKS = [
  { id: "bridge", label: "Bridge" },
  { id: "phone", label: "Phone" },
  { id: "knowledge", label: "Knowledge" },
  { id: "meta", label: "System" },
] as const;

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ syncOk?: string; syncError?: string }>;
}) {
  const syncParams = await searchParams;
  const [trades, vault, rules, revision, history, workerInbox, workerStatus, tokenFlags] =
    await Promise.all([
      getTrades(),
      getVaultStatus(),
      getRules(),
      getSnapshotRevisionState(),
      getSyncHistory(),
      fetchBridgeInbox(),
      checkWorkerReachable(),
      Promise.resolve(getTokenFlags()),
    ]);

  const pendingInbox = await listAllPendingInboxItems(workerInbox);
  const lastNote = await getLastNoteWritten(rules);
  const lastReview = getLastReviewExported(trades);
  const env = getEnvironmentLabel();
  const buildLabel = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local dev";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">System</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Infrastructure — bridge sync, phone LAN, knowledge paths, tokens.
        </p>
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Connect to an assistant via{" "}
          <Link href="/" className="font-medium underline">
            Dashboard
          </Link>
          . Sync here first.
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <SystemSection
        id="bridge"
        title="Bridge"
        description="Cloudflare Worker — publish experiment snapshot."
      >
        <SystemBridgePanel
          syncOk={syncParams.syncOk}
          syncError={syncParams.syncError}
          workerReachable={workerStatus.reachable}
          workerHttpStatus={workerStatus.httpStatus}
          workerUpdatedAt={workerStatus.updatedAt}
          workerRevision={workerStatus.snapshotRevision}
          localRevision={revision?.revision ?? null}
          localUpdatedAt={revision?.updatedAt ?? null}
          history={history}
        />
      </SystemSection>

      <SystemSection
        id="phone"
        title="Phone"
        description="Local WiFi access to full MatrixTrade UI."
      >
        <SystemRow
          label="Inbox (pending)"
          value={
            pendingInbox.length === 0 ? (
              "None"
            ) : (
              <Link href="/inbox" className="underline">
                {pendingInbox.length} · open from Dashboard
              </Link>
            )
          }
        />

        <details className="rounded-lg border border-zinc-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700">
            Connect phone — local WiFi QR
          </summary>
          <div className="border-t border-zinc-100 p-4">
            <p className="mb-4 text-sm text-zinc-500">Same WiFi — full app UI on LAN.</p>
            <ConnectPageContent />
          </div>
        </details>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm">
          <h3 className="font-medium text-zinc-800">Local inbox API</h3>
          <pre className="mt-2 overflow-x-auto rounded border border-zinc-200 bg-white p-3 text-xs">
            {`POST /api/trading/inbox\nAuthorization: Bearer <MATRIXTRADE_INBOX_TOKEN>`}
          </pre>
          <p className="mt-2">
            Token configured:{" "}
            <StatusBadge ok={tokenFlags.inboxToken} label={tokenFlags.inboxToken ? "Yes" : "No"} />
          </p>
        </div>
      </SystemSection>

      <SystemSection id="knowledge" title="Knowledge" description="Obsidian vault paths.">
        <dl className="space-y-3">
          <SystemRow label="Obsidian location" value={vault.vaultPath} mono />
          <SystemRow label="Trades folder" value={`${vault.tradesFolder}/`} />
          <SystemRow
            label="Vault ready"
            value={<StatusBadge ok={vault.ready} label={vault.ready ? "Found" : "Missing"} />}
          />
          <SystemRow
            label="Last note written"
            value={
              lastNote.mtime ? new Date(lastNote.mtime).toLocaleString() : "—"
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
          <SystemRow label="Version" value={`MatrixTrade v${packageJson.version}`} />
          <SystemRow label="Build" value={buildLabel} />
          <SystemRow label="Environment" value={env} />
          <SystemRow
            label="Worker reachable"
            value={
              tokenFlags.bridgeRead ? (
                <StatusBadge
                  ok={workerStatus.reachable}
                  label={workerStatus.reachable ? "Reachable" : "Unreachable"}
                />
              ) : (
                "—"
              )
            }
          />
        </dl>

        <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Tokens configured
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between">
              <span>BRIDGE_WRITE_TOKEN</span>
              <StatusBadge ok={tokenFlags.bridgeWrite} />
            </li>
            <li className="flex justify-between">
              <span>BRIDGE_READ_TOKEN</span>
              <StatusBadge ok={tokenFlags.bridgeRead} />
            </li>
            <li className="flex justify-between">
              <span>MATRIXTRADE_INBOX_TOKEN</span>
              <StatusBadge ok={tokenFlags.inboxToken} />
            </li>
            <li className="flex justify-between">
              <span>MATRIXTRADE_PASSWORD</span>
              <StatusBadge ok={tokenFlags.tradingPassword} />
            </li>
          </ul>
          <p className="mt-3 text-xs text-zinc-400">Values are never displayed.</p>
        </div>
      </SystemSection>

      <nav className="flex gap-4 text-sm">
        <Link href="/" className="text-zinc-600 hover:underline">
          Dashboard →
        </Link>
        <Link href="/" className="text-zinc-600 hover:underline">
          Dashboard
        </Link>
      </nav>
    </div>
  );
}
