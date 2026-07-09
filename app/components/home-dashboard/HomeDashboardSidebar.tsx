import Link from "next/link";
import { formatPct, formatUsd, type AiBridgeOverviewData } from "@/lib/ai-bridge-overview";
import { sampleAiBlock } from "@/lib/ai-block";

const ASSISTANT_RULES = [
  "You speak in actions, not JSON.",
  "AI chooses the internal action type.",
  "One response = one AI Block.",
  "You review every proposal in Inbox.",
  "You apply manually — never auto-apply.",
  "Supabase is the source of truth.",
] as const;

const EXAMPLE_TYPES = [
  "trade-proposal",
  "trade-update",
  "trade-close",
  "analysis",
] as const;

export function HomeDashboardSidebar({
  overview,
  pendingInboxCount,
}: {
  overview: AiBridgeOverviewData;
  pendingInboxCount: number;
}) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">How it works</h2>
        <ol className="mt-3 space-y-2 text-xs text-zinc-600">
          <li>1. Copy Snapshot</li>
          <li>2. AI analyzes + responds</li>
          <li>3. Paste AI Block on Dashboard</li>
          <li>4. Review in Inbox</li>
          <li>5. Apply to Supabase</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
        <h2 className="text-sm font-semibold text-violet-950">Rules</h2>
        <ul className="mt-3 space-y-2">
          {ASSISTANT_RULES.map((rule) => (
            <li key={rule} className="flex gap-2 text-xs text-violet-950/90">
              <span className="text-violet-600">✓</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Quick overview</h2>
          <Link href="/inbox" className="text-xs font-medium text-violet-700 hover:underline">
            Inbox{pendingInboxCount > 0 ? ` (${pendingInboxCount})` : ""}
          </Link>
        </div>

        <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Recent closed trades
        </h3>
        {overview.recentClosed.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">No closed trades yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 text-xs">
            {overview.recentClosed.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 py-2">
                <span>
                  {t.ticker} · {t.id}
                </span>
                <span className={t.won ? "text-emerald-600" : "text-red-600"}>
                  {formatUsd(t.pnl)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Top playbooks (this cycle)
        </h3>
        {overview.topPlaybooks.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">No playbook stats yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 text-xs">
            {overview.topPlaybooks.map((pb) => (
              <li key={pb.name} className="flex justify-between gap-2 py-2">
                <span>{pb.name}</span>
                <span className="text-zinc-600">
                  {formatPct(pb.winRate)} · {formatUsd(pb.pnl)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Pending reviews
        </h3>
        {overview.pendingReviews.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">All caught up.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 text-xs">
            {overview.pendingReviews.map((t) => (
              <li key={t.id} className="py-2">
                <Link href={`/trades/${t.id}/review`} className="text-violet-700 hover:underline">
                  {t.id} · {t.ticker}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Unassigned trades
        </h3>
        {overview.unassignedTrades.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">All trades have a playbook.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 text-xs">
            {overview.unassignedTrades.map((t) => (
              <li key={t.id} className="py-2">
                <Link href={`/trades/${t.id}`} className="text-violet-700 hover:underline">
                  {t.id} · {t.ticker} ({t.status})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">AI Block examples</h2>
        <p className="mt-1 text-xs text-zinc-500">Transparency only — not primary UX.</p>
        <div className="mt-3 space-y-2">
          {EXAMPLE_TYPES.map((type) => (
            <details key={type} className="rounded-lg border border-zinc-100 bg-zinc-50">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-800">
                {type}
              </summary>
              <pre className="max-h-40 overflow-auto border-t border-zinc-100 px-3 py-2 text-[10px] leading-relaxed text-zinc-700">
                {sampleAiBlock(type)}
              </pre>
            </details>
          ))}
        </div>
      </section>
    </aside>
  );
}
