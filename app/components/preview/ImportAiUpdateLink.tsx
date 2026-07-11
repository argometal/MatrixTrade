import Link from "next/link";

export function ImportAiUpdateLink({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact";
}) {
  const base =
    variant === "compact"
      ? "rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-300"
      : "rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Link href="/home-preview?panel=assistant" className={base}>
        Import AI update
      </Link>
      <Link href="/inbox" className="text-[11px] text-zinc-500 hover:text-zinc-300">
        Inbox →
      </Link>
    </div>
  );
}
