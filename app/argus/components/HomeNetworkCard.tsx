"use client";

import Link from "next/link";
import type { Entity, Log } from "@/lib/argus/types";
import { ENTITY_TYPE_LABELS } from "@/lib/argus/labels";
import { HOME_DETAIL } from "@/lib/argus/ux-copy";
import { formatDate } from "./ui";
import { HomeExpandableCard } from "./HomeExpandableCard";
import type { HomeNetworkSummary } from "@/lib/argus/home-helpers";

export function HomeNetworkCard({
  summary,
  expanded,
  onToggle,
}: {
  summary: HomeNetworkSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { intelligence, linkedCount } = summary;
  const { entity, lastMeaningfulInteraction, openFollowUps } = intelligence;

  return (
    <HomeExpandableCard
      expanded={expanded}
      onToggle={onToggle}
      collapsed={
        <div>
          <p className="text-[15px] font-medium text-zinc-100">{entity.name}</p>
          <p className="mt-0.5 text-[13px] text-zinc-500">{ENTITY_TYPE_LABELS[entity.type]}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-zinc-500">
            {lastMeaningfulInteraction ? (
              <span>Last interaction {formatDate(lastMeaningfulInteraction)}</span>
            ) : (
              <span>No interactions yet</span>
            )}
            <span>{HOME_DETAIL.linkedItems(linkedCount)}</span>
          </div>
        </div>
      }
    >
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs text-zinc-600">Type</dt>
          <dd className="text-zinc-200">{ENTITY_TYPE_LABELS[entity.type]}</dd>
        </div>
        {entity.alias ? (
          <div className="mt-2">
            <dt className="text-xs text-zinc-600">Alias</dt>
            <dd className="text-zinc-200">{entity.alias}</dd>
          </div>
        ) : null}
        <div className="mt-2">
          <dt className="text-xs text-zinc-600">Open follow-ups</dt>
          <dd className="text-zinc-200">{openFollowUps}</dd>
        </div>
        <div className="mt-2">
          <dt className="text-xs text-zinc-600">Linked items</dt>
          <dd className="text-zinc-200">{HOME_DETAIL.linkedItems(linkedCount)}</dd>
        </div>
      </dl>
      <Link
        href={`/argus/network/${entity.id}`}
        className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
      >
        Open profile
      </Link>
    </HomeExpandableCard>
  );
}

export function HomeLogCard({
  log,
  entities,
  expanded,
  onToggle,
  accent,
}: {
  log: Log;
  entities: Entity[];
  expanded: boolean;
  onToggle: () => void;
  accent?: "amber";
}) {
  const names = entities.filter((e) => log.entityIds.includes(e.id)).map((e) => e.name);
  const touchDate = log.followUpDate ?? log.date;
  const preview = log.body.trim().replace(/\s+/g, " ").slice(0, 160);

  return (
    <HomeExpandableCard
      expanded={expanded}
      onToggle={onToggle}
      collapsed={
        <div className={accent === "amber" ? "border-l-2 border-amber-500/60 pl-3 -ml-1" : undefined}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 flex-1 text-[15px] font-medium text-zinc-100">{log.title}</p>
            <time className="shrink-0 text-[11px] tabular-nums text-zinc-600">{formatDate(touchDate)}</time>
          </div>
          {preview ? <p className="mt-1.5 line-clamp-2 text-[13px] text-zinc-500">{preview}</p> : null}
        </div>
      }
    >
      {log.body.trim() ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{log.body}</p>
      ) : (
        <p className="text-sm text-zinc-500">No body text.</p>
      )}
      {names.length > 0 ? (
        <p className="mt-3 text-[12px] text-zinc-500">Linked: {names.join(", ")}</p>
      ) : null}
      <Link
        href={`/argus/logs/${log.id}`}
        className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
      >
        Open full record
      </Link>
    </HomeExpandableCard>
  );
}
