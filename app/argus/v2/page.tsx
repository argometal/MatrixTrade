import Link from "next/link";
import { Suspense } from "react";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { isActiveRecord } from "@/lib/argus/supabase-protection/protected-counts";
import {
  buildV2EntityRows,
  buildV2FollowUps,
  buildV2HomeTimeline,
  buildV2TagCloud,
  parseV2EntityTab,
} from "@/lib/argus/v2/loaders";
import {
  buildV2HomeEvidenceSummary,
  buildV2KnowledgeGraph,
  buildV2KnowledgeNodes,
} from "@/lib/argus/v2/intelligence-viz";
import { V2Card, V2SectionTitle } from "./components/v2-ui";
import { V2Timeline, V2TimelineRail } from "./components/V2Timeline";
import { V2TagCloud } from "./components/V2TagCloud";
import { V2HomePulse } from "./components/V2HomePulse";
import { V2HomeMainShell } from "./components/V2HomeMainShell";

const FOLLOW_UP_ICON_STYLES: Record<string, { icon: string; box: string }> = {
  danger: { icon: "↩", box: "bg-red-500/15 text-red-400" },
  warning: { icon: "🏷", box: "bg-amber-500/15 text-amber-400" },
  muted: { icon: "📄", box: "bg-zinc-800 text-zinc-500" },
};

function IconBox({ icon, boxClass }: { icon: string; boxClass: string }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${boxClass}`}
      aria-hidden
    >
      {icon}
    </span>
  );
}

export default async function V2HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const { tab: tabParam, view: viewParam } = await searchParams;
  const tab = parseV2EntityTab(tabParam);

  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const entities = data.entities.filter((e) => !e.deletedAt);

  const followUps = buildV2FollowUps(data, entities, includePrivate, today);
  const homeTimeline = buildV2HomeTimeline(data, inboxItems, includePrivate);
  const entityRows = buildV2EntityRows(data, inboxItems, includePrivate, today, tab, 12);
  const tags = buildV2TagCloud(data, inboxItems, includePrivate);
  const knowledgeNodes = buildV2KnowledgeNodes(data, inboxItems, includePrivate, today);
  const graph = buildV2KnowledgeGraph(data, inboxItems, includePrivate, today);
  const summary = buildV2HomeEvidenceSummary(data, inboxItems, today);
  const inboxPending = inboxItems.filter(
    (item) => isActiveRecord(item) && (item.status === "pending" || item.status === "linked")
  ).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="argus-v2-scroll flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 lg:px-8">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Home</h1>
        <p className="mt-1 text-sm text-zinc-500">Entities first — intelligence when you need the full picture</p>
      </div>

      <V2HomePulse summary={summary} inboxPending={inboxPending} />

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <V2Card className="p-6">
            <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
              <V2HomeMainShell
                tab={tab}
                rows={entityRows}
                nodes={knowledgeNodes}
                graphNodes={graph.nodes}
                graphEdges={graph.edges}
                tags={tags}
                initialView={viewParam}
              />
            </Suspense>
          </V2Card>
        </div>

        <aside className="space-y-6">
          <div id="follow-ups">
            <V2Card className="flex flex-col p-5">
              <V2SectionTitle>Follow Ups</V2SectionTitle>
              {followUps.length === 0 ? (
                <p className="text-sm text-zinc-500">No pending follow-ups.</p>
              ) : (
                <ul className="divide-y divide-zinc-800/80">
                  {followUps.map((item) => {
                    const style = FOLLOW_UP_ICON_STYLES[item.tone];
                    return (
                      <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                        <IconBox icon={style.icon} boxClass={style.box} />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={item.href}
                            className="text-sm font-medium text-zinc-200 hover:text-violet-300"
                          >
                            {item.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-zinc-500">{item.meta}</p>
                        </div>
                        <span
                          className={`shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                            item.tone === "danger"
                              ? "bg-red-500/10 text-red-300 ring-red-500/30"
                              : item.tone === "warning"
                                ? "bg-amber-500/10 text-amber-300 ring-amber-500/30"
                                : "bg-zinc-800 text-zinc-400 ring-zinc-700"
                          }`}
                        >
                          {item.due}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </V2Card>
          </div>

          <div id="tags">
            <V2Card className="p-5">
              <V2SectionTitle
                action={
                  <Link href="/argus/v2?view=intelligence" className="text-xs text-violet-400 hover:text-violet-300">
                    Full view
                  </Link>
                }
              >
                Tags
              </V2SectionTitle>
              <V2TagCloud tags={tags.slice(0, 16)} />
            </V2Card>
          </div>

          <V2Card className="hidden p-5 xl:block">
            <V2SectionTitle
              action={
                <Link href="/argus/journal" className="text-xs text-violet-400 hover:text-violet-300">
                  View all
                </Link>
              }
            >
              Timeline
            </V2SectionTitle>
            {homeTimeline.length === 0 ? (
              <p className="text-sm text-zinc-500">No timeline entries yet.</p>
            ) : (
              <V2TimelineRail entries={homeTimeline} />
            )}
          </V2Card>
        </aside>
      </div>

      {homeTimeline.length > 0 ? (
        <V2Card className="mt-6 p-5 xl:hidden">
          <V2SectionTitle
            action={
              <Link href="/argus/journal" className="text-xs text-violet-400 hover:text-violet-300">
                View all
              </Link>
            }
          >
            Timeline
          </V2SectionTitle>
          <V2Timeline entries={homeTimeline} compact />
        </V2Card>
      ) : null}
      </div>
    </div>
  );
}
