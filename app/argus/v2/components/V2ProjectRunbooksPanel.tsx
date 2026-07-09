"use client";

import Link from "next/link";
import type { Runbook } from "@/lib/argus/types";
import { runbookProgress } from "@/lib/argus/runbook-helpers";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import { V2PanelCard, V2PanelHeader } from "./V2RightPanel";

export function V2ProjectRunbooksPanel({
  runbooks,
  projectId,
}: {
  runbooks: Runbook[];
  projectId: string;
}) {
  const { openCreateFlow } = useArgusAdd();

  return (
    <V2PanelCard>
      <V2PanelHeader
        title="Runbooks"
        action={
          <button
            type="button"
            onClick={() =>
              openCreateFlow({
                itemKind: "runbook",
                linkedEntityIds: [projectId],
                lockItemKind: true,
              })
            }
            className="text-xs font-medium text-violet-400 hover:text-violet-300"
          >
            + Runbook
          </button>
        }
      />
      {runbooks.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Procedures to follow during this engagement — paste steps, check them off as you go.
        </p>
      ) : (
        <ul className="space-y-2">
          {runbooks.map((runbook) => {
            const progress = runbookProgress(runbook.items);
            return (
              <li key={runbook.id}>
                <Link
                  href={`/argus/v2/runbooks/${runbook.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 transition hover:border-lime-500/30 hover:bg-zinc-900/60"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-zinc-200">{runbook.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-lime-300">
                    {progress.open}/{progress.total} open
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </V2PanelCard>
  );
}
