import Link from "next/link";

/**
 * AF03 §2 Focus — pending only.
 * Not equivalent to Active/Archive folders. No system triggers yet.
 */
export default function ForgeFocusPendingPage() {
  return (
    <section className="space-y-4" aria-labelledby="focus-pending-heading">
      <h2 id="focus-pending-heading" className="text-lg font-semibold text-zinc-100">
        Focus <span className="text-sm font-normal uppercase tracking-wide text-amber-500">Pending</span>
      </h2>
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-sm leading-relaxed text-zinc-300">
        Focus is <strong className="text-zinc-100">not implemented</strong> as a manual folder like Active or Archive.
        Later it may be activated or proposed by system signals (not in this slice). No Focus triggers here.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/forge/active"
          className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Open Active
        </Link>
        <Link
          href="/forge/archive"
          className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Open Archive
        </Link>
      </div>
    </section>
  );
}
