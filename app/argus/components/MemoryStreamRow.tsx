import Link from "next/link";
import { formatDate } from "./ui";
import type { Entity, Log } from "@/lib/argus/types";

function previewBody(body: string, max = 120): string {
  const t = body.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function MemoryStreamRow({
  log,
  entities,
  accent,
}: {
  log: Log;
  entities: Entity[];
  accent?: "amber" | "default";
}) {
  const names = entities.filter((e) => log.entityIds.includes(e.id)).map((e) => e.name);
  const touchDate = log.followUpDate ?? log.date;

  return (
    <Link
      href={`/argus/logs/${log.id}`}
      className={`group block py-4 transition ${
        accent === "amber" ? "border-l-2 border-amber-500/60 pl-4 -ml-px" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-zinc-100 group-hover:text-teal-50">
          {log.title}
        </h3>
        <time className="shrink-0 text-[11px] tabular-nums text-zinc-600">{formatDate(touchDate)}</time>
      </div>
      {log.body.trim() && (
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-zinc-500">{previewBody(log.body)}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-600">
        {log.classificationStatus === "needs_classification" && (
          <span className="text-amber-500/90">Needs link</span>
        )}
        {names.length > 0 && <span>{names.join(" · ")}</span>}
        {log.private && <span className="text-violet-500/80">Private</span>}
      </div>
    </Link>
  );
}
