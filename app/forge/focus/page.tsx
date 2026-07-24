import Link from "next/link";

/**
 * Focus — first option in View selector; route kept even when blocked.
 * Not a manual folder. No Focus trigger controls here.
 */
export default function ForgeFocusPendingPage() {
  return (
    <section className="space-y-4" aria-labelledby="focus-pending-heading">
      <p className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-[11px] uppercase tracking-wide text-amber-500">
        View · Focus · blocked / pending system signals
      </p>
      <h2 id="focus-pending-heading" className="text-lg font-semibold text-zinc-100">
        Focus{" "}
        <span className="text-sm font-normal uppercase tracking-wide text-amber-500">Blocked</span>
      </h2>
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-sm leading-relaxed text-zinc-300">
        Focus stays <strong className="text-zinc-100">first</strong> in the View control even when
        unavailable. It is not a bottom-tab twin of Active/Archive and not a manual folder. Later it
        may be proposed by system signals. No Focus triggers in this implementation.
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
