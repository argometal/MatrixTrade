import Link from "next/link";
import { notFound } from "next/navigation";
import { applyInboxItemAction, rejectInboxItemAction } from "@/app/actions";
import {
  describeProposal,
  fetchBridgeInbox,
  parseTradingInboxPayload,
  proposalToPreviewJson,
  validateProposalPayload,
} from "@/lib/bridge";
import { getInboxItemById } from "@/lib/trading-inbox-storage";

export default async function TradingInboxDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ origin?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const origin = query.origin === "local" ? "local" : "worker";

  const workerItems = await fetchBridgeInbox();
  const item = await getInboxItemById(id, workerItems);

  if (!item || item.status !== "pending") notFound();

  const parsed = parseTradingInboxPayload(item.payload);
  const validation = parsed ? validateProposalPayload(parsed) : { ok: false as const, errors: ["Invalid payload"] };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link href="/inbox" className="text-sm text-zinc-500 hover:underline">
          ← Inbox
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Review proposal</h1>
        <p className="text-sm text-zinc-500">
          {item.origin} · {new Date(item.receivedAt).toLocaleString()}
        </p>
      </header>

      {query.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {decodeURIComponent(query.error)}
        </div>
      )}

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Summary</h2>
        <p className="mt-2 text-sm">
          {parsed ? describeProposal(parsed) : "Could not parse proposal type."}
        </p>
        {!validation.ok && (
          <ul className="mt-3 list-inside list-disc text-sm text-amber-700">
            {validation.errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Payload</h2>
        <pre className="mt-2 max-h-96 overflow-auto text-xs leading-relaxed text-zinc-800">
          {parsed ? proposalToPreviewJson(parsed) : JSON.stringify(item.payload, null, 2)}
        </pre>
      </section>

      <div className="flex flex-wrap gap-3">
        <form action={applyInboxItemAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="origin" value={item.origin} />
          <button
            type="submit"
            disabled={!validation.ok}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply to MatrixTrade
          </button>
        </form>
        <form action={rejectInboxItemAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="origin" value={item.origin} />
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Reject
          </button>
        </form>
      </div>

      <p className="text-xs text-zinc-500">
        Applies run through the same validation as manual entry. Trades are never written without
        your click.
      </p>
    </div>
  );
}
