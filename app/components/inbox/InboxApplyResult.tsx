import Link from "next/link";
import {
  formatPersistenceTarget,
  summarizePlaybookEvidence,
  summarizeTradeEvidence,
} from "@/lib/apply-verify";
import { getPlaybookById } from "@/lib/playbooks";
import { getTradeById } from "@/lib/storage";

export async function InboxApplyResult({
  tradeId,
  playbookId,
  type,
  store,
  verified,
  message,
  verifyDetail,
  inboxError,
}: {
  tradeId: string;
  playbookId?: string;
  type: string;
  store: string;
  verified: boolean;
  message: string;
  verifyDetail?: string;
  inboxError?: string;
}) {
  const trade = tradeId ? await getTradeById(tradeId) : undefined;
  const playbook = playbookId ? await getPlaybookById(playbookId) : undefined;
  const evidence =
    summarizeTradeEvidence(trade, type) ?? summarizePlaybookEvidence(playbook ?? undefined);
  const persistenceTarget = formatPersistenceTarget(store);
  const isPlaybookType = type.startsWith("playbook-");

  return (
    <section className="space-y-4 rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-100">
      <h2 className="text-base font-semibold text-emerald-200">Applied successfully</h2>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-400/80">Proposal type</dt>
          <dd className="font-mono text-emerald-100">{type}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-400/80">
            {isPlaybookType ? "Affected playbook" : "Affected trade"}
          </dt>
          <dd className="font-mono text-emerald-100">
            {isPlaybookType ? playbookId || "—" : tradeId || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-400/80">Persistence target</dt>
          <dd className="text-emerald-100">{persistenceTarget}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-400/80">Store verification</dt>
          <dd className="text-emerald-100">
            {verified ? "Confirmed in active store" : "Apply executed but persistence not verified."}
          </dd>
        </div>
      </dl>
      <p className="text-emerald-100">{message}</p>
      {verifyDetail && (
        <p className={verified ? "text-emerald-200" : "font-medium text-amber-300"}>{verifyDetail}</p>
      )}
      {evidence && (
        <p className="rounded-md bg-zinc-950/60 px-3 py-2 font-mono text-xs text-zinc-300">{evidence}</p>
      )}
      {inboxError && (
        <p className="rounded-md border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-amber-200">
          Inbox update warning: {inboxError}
        </p>
      )}
      <div className="flex flex-wrap gap-3 pt-1">
        {tradeId && !isPlaybookType && (
          <Link
            href={`/trades/${tradeId}`}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            Open trade {tradeId}
          </Link>
        )}
        {playbookId && isPlaybookType && (
          <Link
            href="/playbook"
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            Open Playbooks
          </Link>
        )}
        <Link
          href="/home-preview"
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"
        >
          Back to Dashboard
        </Link>
        <Link
          href="/inbox"
          className="text-sm font-medium text-violet-400 hover:text-violet-300 hover:underline"
        >
          Inbox list
        </Link>
      </div>
    </section>
  );
}
