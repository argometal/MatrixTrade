import type { V2TimelineEntry } from "@/lib/argus/v2/mock-data";
import { V2Badge, V2LockIcon, groupTimelineByDate } from "./v2-ui";

function kindLabel(entry: V2TimelineEntry): string {
  if (entry.kind === "journal") {
    return entry.journalSubtype === "note" ? "Note" : "Log";
  }
  if (entry.kind === "email") return "Email";
  if (entry.kind === "meeting") return "Meeting";
  return "Event";
}

function kindTone(entry: V2TimelineEntry): "purple" | "blue" | "green" | "orange" {
  if (entry.kind === "journal") return "purple";
  if (entry.kind === "email") return "blue";
  if (entry.kind === "meeting") return "green";
  return "orange";
}

function kindIcon(entry: V2TimelineEntry): string {
  if (entry.kind === "journal") return "📓";
  if (entry.kind === "email") return "✉";
  if (entry.kind === "meeting") return "📅";
  return "📌";
}

function formatTimelineDate(iso: string): { month: string; day: string; year: string } {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate().toString(),
    year: d.getFullYear().toString(),
  };
}

/** Organization timeline — date column left, mockup-style cards. */
export function V2OrgTimeline({
  entries,
  limit,
}: {
  entries: V2TimelineEntry[];
  limit?: number;
}) {
  const shown = limit ? entries.slice(0, limit) : entries;
  const groups = groupTimelineByDate(shown);
  const hasMore = limit ? entries.length > limit : false;

  if (shown.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-500">No linked records or emails yet.</p>;
  }

  return (
    <div>
      <div className="space-y-6">
        {groups.map(([date, items]) =>
          items.map((entry) => {
            const parts = formatTimelineDate(date);
            return (
              <article key={entry.id} className="flex gap-4 sm:gap-6">
                <div className="hidden w-16 shrink-0 text-right sm:block">
                  <p className="text-[10px] font-semibold tracking-wider text-zinc-500">{parts.month}</p>
                  <p className="text-2xl font-bold tabular-nums text-zinc-300">{parts.day}</p>
                  <p className="text-[10px] text-zinc-600">{parts.year}</p>
                </div>

                <div className="min-w-0 flex-1 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-4 transition hover:border-zinc-700/80">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800/80 text-sm">
                      {kindIcon(entry)}
                    </span>
                    <V2Badge tone={kindTone(entry)}>{kindLabel(entry)}</V2Badge>
                    {entry.tags?.slice(0, 3).map((tag) => (
                      <V2Badge key={tag} tone="default">
                        {tag}
                      </V2Badge>
                    ))}
                    <span className="ml-auto flex items-center gap-2 text-[11px] tabular-nums text-zinc-600">
                      {entry.time}
                      <V2LockIcon protected={entry.protected} />
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold leading-snug text-zinc-100">{entry.title}</h3>
                  {entry.body ? (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-500">{entry.body}</p>
                  ) : null}
                  {entry.author ? (
                    <p className="mt-3 text-xs text-zinc-600">{entry.author}</p>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
      {hasMore ? (
        <button
          type="button"
          className="mt-6 w-full rounded-xl border border-zinc-800 py-2.5 text-sm text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
        >
          Load more
        </button>
      ) : null}
    </div>
  );
}
