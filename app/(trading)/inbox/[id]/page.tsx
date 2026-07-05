import Link from "next/link";
import { notFound } from "next/navigation";
import { applyInboxItemAction, rejectInboxItemAction } from "@/app/actions";
import { InboxApplyResult } from "@/app/components/inbox/InboxApplyResult";
import {
  describeProposal,
  fetchBridgeInbox,
  parseTradingInboxPayload,
  proposalToPreviewJson,
  validateProposalPayload,
} from "@/lib/bridge";
import { getApplyStatusLabel, isApplyImplemented } from "@/lib/ai-bridge-types";
import { getInboxItemById } from "@/lib/trading-inbox-storage";
import { getTradeById } from "@/lib/storage";
import { validateTradeCloseProposal } from "@/lib/validation";

type InboxDetailSearchParams = {
  origin?: string;
  error?: string;
  applied?: string;
  playbookId?: string;
  type?: string;
  tradeId?: string;
  store?: string;
  verified?: string;
  message?: string;
  verifyDetail?: string;
  inboxError?: string;
};

function resolveOrigin(origin: string | undefined): "local" | "supabase" | "worker" {
  if (origin === "local") return "local";
  if (origin === "supabase") return "supabase";
  return "worker";
}

export default async function TradingInboxDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<InboxDetailSearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const origin = resolveOrigin(query.origin);
  const isApplyResult = query.applied === "1";

  const workerItems = await fetchBridgeInbox();
  const item = await getInboxItemById(id, workerItems, origin);

  if (!item && !isApplyResult) notFound();
  if (item && item.status !== "pending" && !isApplyResult) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/inbox" className="text-sm text-zinc-500 hover:underline">
          ← Inbox
        </Link>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          This inbox item was already processed ({item.status}).
        </div>
        <Link href="/inbox" className="text-sm font-medium underline">
          Back to Inbox
        </Link>
      </div>
    );
  }

  if (isApplyResult) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <Link href="/inbox" className="text-sm text-zinc-500 hover:underline">
            ← Inbox
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Apply result</h1>
          <p className="text-sm text-zinc-500">
            {query.origin ?? origin} · inbox item {id}
          </p>
        </header>

        {query.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(query.error)}
          </div>
        )}

        <InboxApplyResult
          tradeId={query.tradeId ?? ""}
          playbookId={query.playbookId}
          type={query.type ?? "unknown"}
          store={query.store ?? "json"}
          verified={query.verified === "1"}
          message={query.message ?? "Apply completed."}
          verifyDetail={query.verifyDetail}
          inboxError={query.inboxError}
        />
      </div>
    );
  }

  if (!item) notFound();

  const parsed = parseTradingInboxPayload(item.payload);
  const validation = parsed
    ? validateProposalPayload(parsed)
    : { ok: false as const, errors: ["Invalid payload"] };
  const tradeCloseError =
    parsed?.type === "trade-close" && validation.ok
      ? validateTradeCloseProposal(
          await getTradeById(String(parsed.proposal.id).toUpperCase()),
          parsed.proposal
        )
      : null;
  const applyReady =
    Boolean(parsed && validation.ok && isApplyImplemented(parsed.type)) &&
    !tradeCloseError;
  const applyPending = Boolean(parsed && validation.ok && !isApplyImplemented(parsed.type));

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
        <p className="mt-1 font-mono text-xs text-zinc-500">inboxItemId: {item.id}</p>
      </header>

      {query.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Apply failed: {query.error}
        </div>
      )}

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Summary</h2>
        <p className="mt-2 text-sm">
          {parsed ? describeProposal(parsed) : "Could not parse proposal type."}
        </p>
        {parsed && validation.ok && (
          <p className="mt-2 text-xs font-medium text-zinc-600">{getApplyStatusLabel(parsed.type)}</p>
        )}
        {!validation.ok && (
          <ul className="mt-3 list-inside list-disc text-sm text-amber-700">
            {validation.errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
        {tradeCloseError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {tradeCloseError}
          </div>
        )}
      </section>

      {applyPending && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Supported by parser · Apply pending — you can import and review this block, but Apply is
          not implemented yet for type <span className="font-mono">{parsed?.type}</span>.
        </div>
      )}

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
            disabled={!applyReady}
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
        Apply writes to the active trades store (Supabase or local JSON). You will see verification
        on the next screen.
      </p>
    </div>
  );
}
