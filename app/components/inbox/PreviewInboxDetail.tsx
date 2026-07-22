import Link from "next/link";
import { InboxApplyActions } from "@/app/components/inbox/InboxApplyActions";
import { InboxApplyResult } from "@/app/components/inbox/InboxApplyResult";
import {
  describeProposal,
  parseTradingInboxPayload,
  proposalToPreviewJson,
  validateProposalPayload,
  type BridgeInboxItem,
} from "@/lib/bridge";
import { getApplyStatusLabel, isApplyImplemented } from "@/lib/ai-bridge-types";

function originLabel(origin: string): string {
  if (origin === "worker") return "Worker bridge";
  if (origin === "supabase") return "Supabase";
  if (origin === "local") return "Local";
  return origin;
}

export function PreviewInboxDetail({
  id,
  origin,
  item,
  isApplyResult,
  query,
  tradeCloseError = null,
}: {
  id: string;
  origin: string;
  item?: BridgeInboxItem;
  isApplyResult: boolean;
  query: {
    error?: string;
    tradeId?: string;
    playbookId?: string;
    type?: string;
    store?: string;
    verified?: string;
    message?: string;
    verifyDetail?: string;
    inboxError?: string;
    alreadyApplied?: string;
  };
  tradeCloseError?: string | null;
}) {
  if (item && item.status !== "pending" && !isApplyResult) {
    return (
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
            <Link href="/inbox" className="text-sm text-zinc-500 hover:text-violet-400">
              ← History
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-zinc-100">Already processed</h1>
          </header>
          <div className="px-4 py-4 lg:px-6">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
              This inbox item was already processed ({item.status}).
            </div>
            <Link
              href="/inbox"
              className="mt-4 inline-block text-sm font-medium text-violet-400 hover:text-violet-300 hover:underline"
            >
              Back to History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isApplyResult) {
    return (
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
            <Link href="/inbox" className="text-sm text-zinc-500 hover:text-violet-400">
              ← History
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-zinc-100">Apply result</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {originLabel(origin)} · inbox item {id}
            </p>
          </header>

          <div className="space-y-4 px-4 py-4 lg:px-6">
            {query.error && (
              <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {decodeURIComponent(query.error)}
              </div>
            )}

            <InboxApplyResult
              tradeId={query.tradeId ?? ""}
              playbookId={query.playbookId}
              type={query.type ?? "unknown"}
              store={query.store ?? "json"}
              verified={query.verified === "1"}
              message={
                query.alreadyApplied === "1"
                  ? `Already applied. ${query.message ?? ""}`
                  : query.message ?? "Apply completed."
              }
              verifyDetail={query.verifyDetail}
              inboxError={query.inboxError}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const parsed = parseTradingInboxPayload(item.payload);
  const validation = parsed
    ? validateProposalPayload(parsed)
    : { ok: false as const, errors: ["Invalid payload"] };
  const applyReady =
    Boolean(parsed && validation.ok && isApplyImplemented(parsed.type)) && !tradeCloseError;
  const applyPending = Boolean(parsed && validation.ok && !isApplyImplemented(parsed.type));

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <Link href="/inbox" className="text-sm text-zinc-500 hover:text-violet-400">
            ← History
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-100">Review proposal</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {originLabel(item.origin)} · {new Date(item.receivedAt).toLocaleString()}
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-600">inboxItemId: {item.id}</p>
        </header>

        <div className="space-y-4 px-4 py-4 lg:px-6">
          {query.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              Apply failed: {query.error}
            </div>
          )}

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Summary</h2>
            <p className="mt-2 text-sm text-zinc-200">
              {parsed ? describeProposal(parsed) : "Could not parse proposal type."}
            </p>
            {parsed && validation.ok && (
              <p className="mt-2 text-xs font-medium text-zinc-400">
                {getApplyStatusLabel(parsed.type)}
              </p>
            )}
            {!validation.ok && (
              <ul className="mt-3 list-inside list-disc text-sm text-amber-400">
                {validation.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
            {tradeCloseError && (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {tradeCloseError}
              </div>
            )}
          </section>

          {parsed && validation.ok ? (
            <section className="rounded-lg border border-violet-500/25 bg-violet-950/20 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-violet-300">Human preview</h2>
              <p className="mt-2 text-sm text-zinc-200">{describeProposal(parsed)}</p>
              <p className="mt-2 text-xs text-zinc-500">
                For new AI Blocks use Control → Apply. This page is for review and Worker items.
              </p>
            </section>
          ) : null}

          {applyPending && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
              Supported by parser · Apply pending — review only for type{" "}
              <span className="font-mono text-amber-100">{parsed?.type}</span>.
            </div>
          )}

          <details className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Raw payload (technical)
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto text-xs leading-relaxed text-zinc-300">
              {parsed ? proposalToPreviewJson(parsed) : JSON.stringify(item.payload, null, 2)}
            </pre>
          </details>

          <InboxApplyActions id={item.id} origin={item.origin} applyReady={applyReady} />

          <p className="text-xs text-zinc-600">
            Apply writes to the active trades store (Supabase or local JSON). You will see verification
            on the next screen.
          </p>
        </div>
      </div>
    </div>
  );
}
