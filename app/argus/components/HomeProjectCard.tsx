"use client";

import Link from "next/link";
import { deleteEntityAction } from "@/app/argus/actions";
import { ArgusDeleteForm } from "./ArgusDeleteForm";
import { HOME_DETAIL, TESTING } from "@/lib/argus/ux-copy";
import { HomeExpandableCard } from "./HomeExpandableCard";
import type { HomeProjectSummary } from "@/lib/argus/home-helpers";

export function HomeProjectCard({
  summary,
  expanded,
  onToggle,
}: {
  summary: HomeProjectSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { entity, logCount, inboxCount, linkedCount } = summary;

  return (
    <HomeExpandableCard
      expanded={expanded}
      onToggle={onToggle}
      collapsed={
        <div>
          <p className="text-[15px] font-medium text-zinc-100">{entity.name}</p>
          <p className="mt-1 text-[13px] text-zinc-500">{HOME_DETAIL.linkedItems(linkedCount)}</p>
        </div>
      }
    >
      <dl className="space-y-2 text-sm text-zinc-300">
        <div className="flex justify-between gap-3 border-b border-zinc-800/60 py-2">
          <dt>Logs</dt>
          <dd className="tabular-nums text-zinc-200">{logCount}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b border-zinc-800/60 py-2">
          <dt>Emails</dt>
          <dd className="tabular-nums text-zinc-200">{inboxCount}</dd>
        </div>
        <div className="flex justify-between gap-3 py-2">
          <dt>Total linked</dt>
          <dd className="tabular-nums text-zinc-200">{linkedCount}</dd>
        </div>
      </dl>
      <Link
        href={`/argus/network/${entity.id}`}
        className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
      >
        Open project
      </Link>
      <ArgusDeleteForm
        action={deleteEntityAction}
        confirmMessage={TESTING.deleteEntityConfirm}
        label={TESTING.deleteEntity}
        className="mt-3"
      >
        <input type="hidden" name="entityId" value={entity.id} />
      </ArgusDeleteForm>
    </HomeExpandableCard>
  );
}
