import Link from "next/link";
import type { TagPattern } from "@/lib/argus/v2/tag-patterns";
import { TAG_PATTERN_BADGE_LIMIT } from "@/lib/argus/tag-limits";

export function V2TagPatternBadges({
  patterns,
  className = "",
}: {
  patterns: TagPattern[];
  className?: string;
}) {
  if (patterns.length === 0) return null;

  const visible = patterns.slice(0, TAG_PATTERN_BADGE_LIMIT);
  const overflow = patterns.length - visible.length;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="list" aria-label="Recurring tag patterns">
      {visible.map((pattern) => (
        <Link
          key={pattern.tag}
          href={`/argus/v2/inbox?tag=${encodeURIComponent(pattern.tag)}`}
          role="listitem"
          className="inline-flex items-center gap-1 rounded-full bg-red-950/40 px-2.5 py-1 text-[11px] font-medium text-red-300/95 ring-1 ring-red-500/35 transition hover:bg-red-950/55 hover:text-red-200"
          title={`#${pattern.tag} — ${pattern.count} evidence items in scope (${pattern.recentCount} recent)`}
        >
          <span aria-hidden>⚑</span>
          <span>#{pattern.tag}</span>
          <span className="tabular-nums text-red-400/80">({pattern.count})</span>
        </Link>
      ))}
      {overflow > 0 ? (
        <span className="text-[11px] text-zinc-500" title={`${overflow} more recurring patterns`}>
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
