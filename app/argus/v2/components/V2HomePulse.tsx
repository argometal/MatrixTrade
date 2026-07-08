import Link from "next/link";
import type { V2HomeEvidenceSummary } from "@/lib/argus/v2/intelligence-viz";

/** Lightweight evidence pulse — industry home pattern (Salesforce/Notion), not analytics canvas. */
export function V2HomePulse({ summary, inboxPending }: { summary: V2HomeEvidenceSummary; inboxPending: number }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-500">
      <Link href="/argus/v2#entities" className="transition hover:text-zinc-300">
        <span className="font-semibold tabular-nums text-zinc-200">{summary.journal}</span> journal
        {summary.journalWeek > 0 ? (
          <span className="ml-1 text-emerald-500/90">+{summary.journalWeek} this week</span>
        ) : null}
      </Link>
      <Link href="/argus/v2/inbox" className="transition hover:text-zinc-300">
        <span className="font-semibold tabular-nums text-zinc-200">{summary.emails}</span> emails
        {summary.emailWeek > 0 ? (
          <span className="ml-1 text-emerald-500/90">+{summary.emailWeek} this week</span>
        ) : null}
        {inboxPending > 0 ? (
          <span className="ml-1 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-violet-500/30">
            {inboxPending} pending
          </span>
        ) : null}
      </Link>
      <Link href="/argus/v2/browse/network" className="transition hover:text-zinc-300">
        <span className="font-semibold tabular-nums text-zinc-200">{summary.people}</span> people
      </Link>
      <Link href="/argus/v2/browse/organizations" className="transition hover:text-zinc-300">
        <span className="font-semibold tabular-nums text-zinc-200">{summary.organizations}</span> orgs
      </Link>
      <Link href="/argus/v2/browse/projects" className="transition hover:text-zinc-300">
        <span className="font-semibold tabular-nums text-zinc-200">{summary.projects}</span> projects
      </Link>
    </div>
  );
}
