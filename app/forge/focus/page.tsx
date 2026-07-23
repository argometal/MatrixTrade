import Link from "next/link";

/**
 * Focus — DEPRECATED / PENDING (not in bottom navigation).
 * Kept for future system-signal logic. Not a manual folder.
 * Do not add Focus trigger controls here.
 */
export default function ForgeFocusPendingPage() {
  return (
    <section className="space-y-4" aria-labelledby="focus-pending-heading">
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500">
        Deprecated route · hidden from navigation · pending system signals
      </p>
      <h2 id="focus-pending-heading" className="text-lg font-semibold text-zinc-100">
        Focus{" "}
        <span className="text-sm font-normal uppercase tracking-wide text-amber-500">Pending</span>
      </h2>
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-sm leading-relaxed text-zinc-300">
        Focus is <strong className="text-zinc-100">not</strong> a bottom-nav destination and not a
        manual folder. Later it may be proposed by system signals. No Focus triggers in this
        implementation.
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
        <Link
          href="/forge"
          className="inline-flex min-h-11 items-center rounded-lg border border-zinc-800 px-4 text-sm font-medium text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Home
        </Link>
      </div>
    </section>
  );
}
