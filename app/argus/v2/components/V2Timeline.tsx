import type { V2TimelineEntry } from "@/lib/argus/v2/mock-data";
import { V2Badge, V2LockIcon, formatV2Date, groupTimelineByDate } from "./v2-ui";

function kindLabel(entry: V2TimelineEntry): string {
  if (entry.kind === "journal") {
    return entry.journalSubtype === "note" ? "Journal · Note" : "Journal · Log";
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

function kindDot(entry: V2TimelineEntry): string {
  if (entry.kind === "journal") return "bg-violet-500 ring-violet-500/30";
  if (entry.kind === "email") return "bg-sky-500 ring-sky-500/30";
  if (entry.kind === "meeting") return "bg-emerald-500 ring-emerald-500/30";
  return "bg-orange-500 ring-orange-500/30";
}

export function V2Timeline({
  entries,
  subtitle,
  compact = false,
}: {
  entries: V2TimelineEntry[];
  subtitle?: string;
  compact?: boolean;
}) {
  const groups = groupTimelineByDate(entries);

  return (
    <div>
      {subtitle ? <p className="mb-4 text-xs text-zinc-500">{subtitle}</p> : null}
      <div className="space-y-8">
        {groups.map(([date, items]) => (
          <div key={date}>
            <p className="mb-4 text-[11px] font-semibold tracking-wider text-zinc-500">{formatV2Date(date)}</p>
            <div className="relative space-y-4 pl-6">
              <div className="absolute bottom-2 left-[7px] top-2 w-px bg-zinc-800" />
              {items.map((entry) => (
                <article key={entry.id} className="relative">
                  <span
                    className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-zinc-950 ${kindDot(entry)}`}
                  />
                  <div
                    className={`rounded-xl border border-zinc-800/80 bg-zinc-900/50 ${compact ? "p-3" : "p-4"} transition hover:border-zinc-700/80`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <V2Badge tone={kindTone(entry)}>{kindLabel(entry)}</V2Badge>
                      {entry.tags?.map((tag) => (
                        <V2Badge key={tag} tone="default">
                          {tag}
                        </V2Badge>
                      ))}
                      <span className="ml-auto flex items-center gap-2 text-[11px] text-zinc-600">
                        {entry.time}
                        <V2LockIcon protected={entry.protected} />
                      </span>
                    </div>
                    <h3 className={`font-medium text-zinc-100 ${compact ? "text-sm" : "text-base"}`}>{entry.title}</h3>
                    {entry.body ? (
                      <p className={`mt-1.5 text-zinc-500 ${compact ? "line-clamp-2 text-xs" : "text-sm leading-relaxed"}`}>
                        {entry.body}
                      </p>
                    ) : null}
                    {entry.author ? <p className="mt-2 text-xs text-zinc-600">{entry.author}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function V2TimelineRail({ entries }: { entries: V2TimelineEntry[] }) {
  const groups = groupTimelineByDate(entries.slice(0, 6));

  return (
    <div className="space-y-6">
      {groups.map(([date, items]) => (
        <div key={date}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            {date === new Date().toISOString().slice(0, 10) ? "Today" : formatV2Date(date)}
          </p>
          <div className="relative space-y-3 border-l border-zinc-800 pl-4">
            {items.map((entry) => (
              <div key={entry.id} className="relative">
                <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${kindDot(entry).split(" ")[0]}`} />
                <p className="text-xs font-medium text-zinc-300 line-clamp-1">{entry.title}</p>
                <p className="text-[10px] text-zinc-600">{entry.time ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
