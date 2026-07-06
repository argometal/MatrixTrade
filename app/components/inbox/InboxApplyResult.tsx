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
    <section className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <h2 className="text-base font-semibold">Applied successfully</h2>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-800">Proposal type</dt>
          <dd className="font-mono">{type}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-800">
            {isPlaybookType ? "Affected playbook" : "Affected trade"}
          </dt>
          <dd className="font-mono">{isPlaybookType ? playbookId || "—" : tradeId || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-800">Persistence target</dt>
          <dd>{persistenceTarget}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-emerald-800">Store verification</dt>
          <dd>{verified ? "Confirmed in active store" : "Apply executed but persistence not verified."}</dd>
        </div>
      </dl>
      <p>{message}</p>
      {verifyDetail && (
        <p className={verified ? "text-emerald-900" : "font-medium text-amber-900"}>{verifyDetail}</p>
      )}
      {evidence && (
        <p className="rounded-md bg-white/70 px-3 py-2 font-mono text-xs text-zinc-800">{evidence}</p>
      )}
      {inboxError && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950">
          Inbox update warning: {inboxError}
        </p>
      )}
      <div className="flex flex-wrap gap-3 pt-1">
        {tradeId && !isPlaybookType && (
          <Link
            href={`/trades/${tradeId}`}
            className="rounded-md bg-emerald-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Open trade {tradeId}
          </Link>
        )}
        {playbookId && isPlaybookType && (
          <Link
            href="/playbook"
            className="rounded-md bg-emerald-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Open Playbooks
          </Link>
        )}
        <Link
          href="/"
          className="rounded-md border border-emerald-800 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-white/60"
        >
          Back to Dashboard
        </Link>
        <Link href="/inbox" className="text-sm font-medium underline text-emerald-900">
          Inbox list
        </Link>
      </div>
    </section>
  );
}
