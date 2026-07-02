import Link from "next/link";
import { formatDate } from "./ui";
import type { Entity, Log } from "@/lib/argus/types";
import { JOURNAL_KIND_LABELS } from "@/lib/argus/labels";

export function CompactLogRow({ log, entities }: { log: Log; entities: Entity[] }) {
  const names = entities.filter((e) => log.entityIds.includes(e.id)).map((e) => e.name);
  const touchDate = log.kind === "follow_up" && log.followUpDate ? log.followUpDate : log.date;

  return (
    <Link
      href={`/argus/logs/${log.id}`}
      className="flex items-center gap-3 border-b border-zinc-800/80 py-2.5 transition hover:bg-zinc-900/50"
    >
      <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-wide text-teal-500/90">
        {JOURNAL_KIND_LABELS[log.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">
          {log.classificationStatus === "needs_classification" && (
            <span className="mr-1.5 text-amber-400" title="Needs classification">
              ○
            </span>
          )}
          {log.title}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {formatDate(touchDate)}
          {names.length > 0 && ` · ${names.join(", ")}`}
        </p>
      </div>
      {log.private && <span className="shrink-0 text-[10px] text-violet-400">🔒</span>}
      <span className="shrink-0 text-zinc-600">›</span>
    </Link>
  );
}

export function CompactEntityRow({ entity, meta }: { entity: Entity; meta?: string }) {
  return (
    <Link
      href={`/argus/network/${entity.id}`}
      className="flex items-center justify-between gap-2 border-b border-zinc-800/80 py-2.5 transition hover:bg-zinc-900/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-100">{entity.name}</p>
        {meta && <p className="truncate text-xs text-zinc-500">{meta}</p>}
      </div>
      <span className="shrink-0 text-zinc-600">›</span>
    </Link>
  );
}
