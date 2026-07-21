import Link from "next/link";

/** Legacy switch — Enter Trade removed; Scout owns execution prep. */
export function TradesViewSwitch() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/planning"
        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
      >
        Scout war room
      </Link>
      <Link
        href="/trades"
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
      >
        Trades histórico
      </Link>
    </div>
  );
}
