import Link from "next/link";
import {
  describeProposal,
  fetchBridgeInbox,
  parseTradingInboxPayload,
} from "@/lib/bridge";
import { listPendingInboxForRuntime } from "@/lib/trading-inbox-submit";

export default async function TradingInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string; error?: string }>;
}) {
  const params = await searchParams;
  const workerItems = await fetchBridgeInbox();
  const items = await listPendingInboxForRuntime(workerItems);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-zinc-500">
          Import AI Blocks from AI Workspace or Worker bridge — preview before Apply.
        </p>
      </header>

      {params.applied && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          ✓ {decodeURIComponent(params.applied)}
        </div>
      )}

      {params.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {decodeURIComponent(params.error)}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Inbox empty. Import an AI Block from{" "}
          <Link href="/ai-workspace" className="underline">
            AI Workspace
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm">
          {items.map((item) => {
            const parsed = parseTradingInboxPayload(item.payload);
            return (
              <li key={`${item.origin}-${item.id}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {parsed ? describeProposal(parsed) : "Unknown payload"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {item.origin} · {new Date(item.receivedAt).toLocaleString()}
                  </p>
                </div>
                <Link href={`/inbox/${item.id}?origin=${item.origin}`} className="font-medium underline">
                  Review
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
