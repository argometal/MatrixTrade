import Link from "next/link";

export function ImportAiUpdateLink({
  className = "",
  variant: _variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact";
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[11px] text-zinc-500">
        Updates: <span className="text-emerald-400/90">Control → Apply</span>
      </span>
      <Link href="/inbox" className="text-[11px] text-zinc-500 hover:text-zinc-300">
        History →
      </Link>
    </div>
  );
}
