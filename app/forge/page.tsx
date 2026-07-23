import Link from "next/link";

/**
 * AF03 §1 — ArgusForge Home (minimal).
 * Not a final Home architecture. Only navigation into Active / Archive.
 * Focus is visible as pending only.
 */
export default function ForgeHomePage() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-zinc-400">
        Minimal home — not the final ArgusForge Home. Use Active or Archive to browse folders and Chaos Decks.
      </p>

      <ul className="space-y-3">
        <li>
          <Link
            href="/forge/active"
            className="flex min-h-14 flex-col justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <span className="font-semibold text-zinc-100">Active</span>
            <span className="text-xs text-zinc-500">Principal operational view</span>
          </Link>
        </li>
        <li>
          <Link
            href="/forge/archive"
            className="flex min-h-14 flex-col justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <span className="font-semibold text-zinc-100">Archive</span>
            <span className="text-xs text-zinc-500">Preserves content — not deletion</span>
          </Link>
        </li>
        <li>
          <Link
            href="/forge/focus"
            className="flex min-h-14 flex-col justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <span className="font-semibold text-zinc-300">
              Focus <span className="text-xs font-normal uppercase tracking-wide text-amber-500/90">Pending</span>
            </span>
            <span className="text-xs text-zinc-600">Not a manual folder — system signals later</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
