import Link from "next/link";

/** ARGUS-style switch: classic dashboard ↔ home preview (mockup design). */
export function DashboardViewSwitch({ mode }: { mode: "classic" | "preview" }) {
  if (mode === "classic") {
    return (
      <Link
          href="/home-preview"
          className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-800 transition hover:border-violet-400/60 hover:bg-violet-500/15"
        >
        <span aria-hidden>✦</span>
        Open Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/?classic=1"
      className="rounded-xl border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
    >
      Classic view →
    </Link>
  );
}
