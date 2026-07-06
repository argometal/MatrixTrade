import Link from "next/link";

export function TradesViewSwitch({ mode }: { mode: "classic" | "preview" }) {
  if (mode === "classic") {
    return (
      <Link
        href="/trades-preview"
        className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-800 transition hover:border-violet-400/60 hover:bg-violet-500/15"
      >
        <span aria-hidden>✦</span>
        Open Trades preview
      </Link>
    );
  }

  return (
    <Link
      href="/trades"
      className="rounded-xl border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
    >
      Classic trades →
    </Link>
  );
}
