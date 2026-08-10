import Link from "next/link";
import type { TagPattern } from "@/lib/argus/v2/tag-patterns";
import { TAG_PATTERN_BADGE_LIMIT } from "@/lib/argus/tag-limits";
import { signalTagKeySet } from "@/lib/argus/signal-tags";

export function V2TagPatternBadges({
  patterns,
  className = "",
  tagHref,
  signalTags,
  /** Vertical stack for sweepable reading (Links tab); wrap = classic chip cloud. */
  orientation = "wrap",
}: {
  patterns: TagPattern[];
  className?: string;
  /** Default drills to inbox tag filter. */
  tagHref?: (tag: string) => string;
  /** Journal focus Tags — pattern chips matching these are highlight-critical. */
  signalTags?: string[];
  orientation?: "wrap" | "stack";
}) {
  if (patterns.length === 0) return null;

  const hrefFor = tagHref ?? ((tag: string) => `/argus/v2/inbox?tag=${encodeURIComponent(tag)}`);
  const focusKeys = signalTagKeySet(signalTags);

  const ranked = [...patterns].sort((a, b) => {
    const aFocus = focusKeys.has(a.tag.trim().toLowerCase()) ? 1 : 0;
    const bFocus = focusKeys.has(b.tag.trim().toLowerCase()) ? 1 : 0;
    if (aFocus !== bFocus) return bFocus - aFocus;
    return b.count - a.count || a.tag.localeCompare(b.tag);
  });

  const visible = ranked.slice(0, TAG_PATTERN_BADGE_LIMIT);
  const overflow = ranked.length - visible.length;
  const stack = orientation === "stack";

  return (
    <div
      className={`${stack ? "flex flex-col gap-1.5" : "flex flex-wrap items-center gap-1.5"} ${className}`}
      role="list"
      aria-label="Recurring tag patterns"
    >
      {visible.map((pattern) => {
        const isFocus = focusKeys.has(pattern.tag.trim().toLowerCase());
        return (
          <Link
            key={pattern.tag}
            href={hrefFor(pattern.tag)}
            role="listitem"
            className={
              stack
                ? isFocus
                  ? "flex w-full items-center justify-between gap-2 rounded-lg border border-amber-400/70 bg-rose-950/65 px-2.5 py-1.5 text-[12px] font-semibold text-amber-100 ring-1 ring-rose-500/40 transition hover:bg-rose-950/80 hover:text-amber-50"
                  : "flex w-full items-center justify-between gap-2 rounded-lg border border-red-500/35 bg-red-950/40 px-2.5 py-1.5 text-[12px] font-medium text-red-300/95 transition hover:bg-red-950/55 hover:text-red-200"
                : isFocus
                  ? "inline-flex items-center gap-1 rounded-full border border-amber-400/70 bg-rose-950/65 px-2.5 py-1 text-[11px] font-semibold text-amber-100 ring-2 ring-rose-500/50 transition hover:bg-rose-950/80 hover:text-amber-50"
                  : "inline-flex items-center gap-1 rounded-full bg-red-950/40 px-2.5 py-1 text-[11px] font-medium text-red-300/95 ring-1 ring-red-500/35 transition hover:bg-red-950/55 hover:text-red-200"
            }
            title={
              isFocus
                ? `#${pattern.tag} — Tracker. ${pattern.count} notes/emails in scope (${pattern.recentCount} recent).`
                : `#${pattern.tag} — ${pattern.count} notes/emails tagged in scope (${pattern.recentCount} recent).`
            }
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden>⚑</span>
              <span className="truncate">#{pattern.tag}</span>
            </span>
            <span className={`shrink-0 tabular-nums ${isFocus ? "text-amber-200/85" : "text-red-400/80"}`}>
              ({pattern.count})
            </span>
          </Link>
        );
      })}
      {overflow > 0 ? (
        <span className="text-[11px] text-zinc-500" title={`${overflow} more recurring patterns`}>
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
