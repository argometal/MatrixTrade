import Link from "next/link";
import {
  describeProposal,
  parseTradingInboxPayload,
  type BridgeInboxItem,
} from "@/lib/bridge";

function originLabel(origin: string): string {
  if (origin === "worker") return "Worker bridge";
  if (origin === "supabase") return "Supabase";
  if (origin === "local") return "Local";
  return origin;
}

export function PreviewInbox({
  items,
  applied,
  error,
}: {
  items: BridgeInboxItem[];
  applied?: string;
  error?: string;
}) {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Proposal history</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Past AI proposals and Worker bridge items — optional audit trail. Use Connect → Accept on each page for new updates.
              </p>
            </div>
            <Link
              href="/home-preview?panel=assistant"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 lg:mr-[5.75rem]"
            >
              Asistente IA
            </Link>
          </div>
        </header>

        <div className="px-4 py-4 lg:px-6">
          {applied && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
              ✓ {decodeURIComponent(applied)}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {decodeURIComponent(error)}
            </div>
          )}

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 px-4 py-10 text-center text-sm text-zinc-500">
              No proposal history yet. Use <span className="text-violet-300">Connect</span> on any workspace page to paste and Accept AI blocks.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900/50">
              {items.map((item) => {
                const parsed = parseTradingInboxPayload(item.payload);
                return (
                  <li
                    key={`${item.origin}-${item.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-zinc-800/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-100">
                        {parsed ? describeProposal(parsed) : "Unknown payload"}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {originLabel(item.origin)} · {new Date(item.receivedAt).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href={`/inbox/${item.id}?origin=${item.origin}`}
                      className="shrink-0 rounded-lg bg-violet-600/20 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-600/30"
                    >
                      Review
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
