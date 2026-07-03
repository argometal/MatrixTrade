import Link from "next/link";
import { Card, formatDate } from "./ui";
import type { Entity, InboxItem, Log } from "@/lib/argus/types";
import {
  ENTITY_TYPE_LABELS,
  INBOX_SOURCE_LABELS,
  INBOX_STATUS_LABELS,
  JOURNAL_KIND_LABELS,
  LOG_SOURCE_LABELS,
} from "@/lib/argus/labels";

export function LogCard({ log, entities }: { log: Log; entities?: Entity[] }) {
  const names =
    entities?.filter((e) => log.entityIds.includes(e.id)).map((e) => e.name) ?? [];

  return (
    <Link href={`/argus/logs/${log.id}`}>
      <Card className="transition hover:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-teal-600/20 px-2.5 py-0.5 text-xs text-teal-400">
                {JOURNAL_KIND_LABELS[log.kind]}
              </span>
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                {LOG_SOURCE_LABELS[log.source]}
              </span>
              {log.private && (
                <span className="rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs text-violet-300">
                  Private
                </span>
              )}
            </div>
            <h3 className="font-semibold text-zinc-50">{log.title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{formatDate(log.date)}</p>
            {log.kind === "follow_up" && log.followUpDate && (
              <p className="mt-1 text-xs text-amber-400">Next touch: {formatDate(log.followUpDate)}</p>
            )}
            {names.length > 0 && (
              <p className="mt-1 text-xs text-teal-500">{names.join(" · ")}</p>
            )}
            <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{log.body}</p>
          </div>
          <span className="text-zinc-600">›</span>
        </div>
      </Card>
    </Link>
  );
}

export function InboxCard({ item }: { item: InboxItem }) {
  const statusClass =
    item.status === "pending"
      ? "bg-amber-600/20 text-amber-400"
      : item.status === "linked"
        ? "bg-teal-600/20 text-teal-400"
        : item.status === "converted"
          ? "bg-violet-600/20 text-violet-300"
          : "bg-zinc-800 text-zinc-500";

  return (
    <Link href={`/argus/inbox/${item.id}`}>
      <Card className="transition hover:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-amber-600/20 px-2.5 py-0.5 text-xs text-amber-400">
                {INBOX_SOURCE_LABELS[item.source]}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusClass}`}>
                {INBOX_STATUS_LABELS[item.status]}
              </span>
            </div>
            <h3 className="mt-2 font-semibold text-zinc-50">
              {item.subject || item.rawText.slice(0, 80) || "Inbox item"}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {new Date(item.receivedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {item.from ? ` · ${item.from}` : ""}
              {item.attachmentIds.length > 0
                ? ` · ${item.attachmentIds.length} attachment${item.attachmentIds.length !== 1 ? "s" : ""}`
                : ""}
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{item.rawText}</p>
          </div>
          <span className="text-zinc-600">›</span>
        </div>
      </Card>
    </Link>
  );
}

export function EntityChip({ entity }: { entity: Entity }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
      {ENTITY_TYPE_LABELS[entity.type]} · {entity.name}
    </span>
  );
}
