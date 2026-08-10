import Link from "next/link";
import type { TagPattern } from "@/lib/argus/v2/tag-patterns";
import { TAG_PATTERN_BADGE_LIMIT } from "@/lib/argus/tag-limits";
import { signalTagKeySet } from "@/lib/argus/signal-tags";
import {
  TAG_MANAGE_LIST_CLASS,
  TAG_MANAGE_ROW_CLASS,
  TAG_MANAGE_ROW_TRACKER_CLASS,
} from "./tag-manage-list";

/**
 * Tag inventory rows — Manage List · rows orientation by default
 * (vertical full-width, same family as Organizations List).
 */
export function V2TagPatternBadges({
  patterns,
  className = "",
  tagHref,
  signalTags,
  /** @deprecated Always Manage stack; kept for call-site compatibility. */
  orientation: _orientation = "stack",
}: {
  patterns: TagPattern[];
  className?: string;
  tagHref?: (tag: string) => string;
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

  return (
    <div className={`${TAG_MANAGE_LIST_CLASS} ${className}`} role="list" aria-label="Tags in this scope">
      {visible.map((pattern) => {
        const isFocus = focusKeys.has(pattern.tag.trim().toLowerCase());
        return (
          <Link
            key={pattern.tag}
            href={hrefFor(pattern.tag)}
            role="listitem"
            className={isFocus ? TAG_MANAGE_ROW_TRACKER_CLASS : TAG_MANAGE_ROW_CLASS}
            title={
              isFocus
                ? `#${pattern.tag} — Tracker. ${pattern.count} notes/emails in scope (${pattern.recentCount} recent).`
                : `#${pattern.tag} — ${pattern.count} notes/emails tagged in scope (${pattern.recentCount} recent).`
            }
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isFocus ? "bg-amber-500/20 text-amber-100" : "bg-violet-600/20 text-violet-200"
                }`}
                aria-hidden
              >
                {isFocus ? "⚑" : "#"}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-zinc-100">#{pattern.tag}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {pattern.count} in scope
                  {isFocus ? " · Tracker" : ""}
                </span>
              </span>
            </span>
            <span className={`shrink-0 tabular-nums text-xs ${isFocus ? "text-amber-200/85" : "text-violet-300"}`}>
              {pattern.count}
            </span>
          </Link>
        );
      })}
      {overflow > 0 ? (
        <p className="px-1 text-[11px] text-zinc-500" title={`${overflow} more`}>
          +{overflow} more
        </p>
      ) : null}
    </div>
  );
}
