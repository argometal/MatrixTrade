"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { V2NavCounts } from "@/lib/argus/v2/loaders";
import type { V2TimelineEntry } from "@/lib/argus/v2/mock-data";
import type { IntelligenceFrom } from "@/lib/argus/v2/intelligence-nav";
import { type V2KnowledgeNode } from "@/lib/argus/v2/intelligence-viz";
import { V2Card, V2SectionTitle } from "./v2-ui";
import { V2HomeIntelligencePanel, type IntelligenceTab } from "./V2HomeIntelligencePanel";
import { V2HomePulse } from "./V2HomePulse";
import { V2IntelligenceLens, V2IntelligenceLensEmpty } from "./V2IntelligenceLens";
import { V2TabBar } from "./V2TabBar";
import { V2TagCloud, type V2TagCloudItem } from "./V2TagCloud";
import { V2Timeline, V2TimelineRail } from "./V2Timeline";
import {
  BrowseQuickLinks,
  parseV2HomeView,
  type V2HomeView,
} from "./V2HomeMainShell";

const HOME_VIEW_TABS: { id: V2HomeView; label: string }[] = [
  { id: "intelligence", label: "Intelligence" },
  { id: "browse", label: "Browse" },
];

const INTELLIGENCE_TABS: { id: IntelligenceTab; label: string }[] = [
  { id: "treemap", label: "Treemap" },
  { id: "portfolio", label: "Portfolio" },
  { id: "tags", label: "Tags" },
];

const TAB_SOURCE: Record<IntelligenceTab, IntelligenceFrom> = {
  treemap: "treemap",
  portfolio: "portfolio",
  tags: "tags",
};

const FOLLOW_UP_ICON_STYLES: Record<string, { icon: string; box: string }> = {
  danger: { icon: "↩", box: "bg-red-500/15 text-red-400" },
  warning: { icon: "🏷", box: "bg-amber-500/15 text-amber-400" },
  muted: { icon: "📄", box: "bg-zinc-800 text-zinc-500" },
};

type FollowUpItem = {
  id: string;
  title: string;
  meta: string;
  due: string;
  tone: "danger" | "warning" | "muted";
  href: string;
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

export function V2HomeClient({
  nodes,
  tags,
  signals,
  initialView,
  followUps,
  homeTimeline,
}: {
  nodes: V2KnowledgeNode[];
  tags: V2TagCloudItem[];
  signals: V2NavCounts;
  initialView?: string;
  followUps: FollowUpItem[];
  homeTimeline: V2TimelineEntry[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseV2HomeView(searchParams.get("view") ?? initialView);
  const [intelTab, setIntelTab] = useState<IntelligenceTab>("treemap");
  const [lensId, setLensId] = useState<string | null>(null);

  const lensNode = lensId ? nodes.find((node) => node.id === lensId) : undefined;
  const showLensDock = view === "intelligence" && intelTab !== "tags";

  function setView(next: V2HomeView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "intelligence") {
      params.delete("view");
      params.delete("tab");
    } else {
      params.set("view", "browse");
      setLensId(null);
    }
    const query = params.toString();
    router.replace(query ? `/argus/v2?${query}` : "/argus/v2");
  }

  function changeIntelTab(next: IntelligenceTab) {
    setIntelTab(next);
    if (next === "tags") setLensId(null);
  }

  const treemapNodes = useMemo(() => nodes, [nodes]);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <V2Card className="p-5 sm:p-6">
            <div id="intelligence">
              <div className="mb-4">
                <V2HomePulse signals={signals} />
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <V2TabBar tabs={HOME_VIEW_TABS} active={view} onChange={setView} size="md" />
                {view === "intelligence" ? (
                  <V2TabBar tabs={INTELLIGENCE_TABS} active={intelTab} onChange={changeIntelTab} />
                ) : null}
              </div>

              {view === "browse" ? (
                <BrowseQuickLinks />
              ) : (
                <V2HomeIntelligencePanel
                  nodes={treemapNodes}
                  tags={tags}
                  tab={intelTab}
                  onLensChange={setLensId}
                />
              )}
            </div>
          </V2Card>
        </div>

        <aside className="space-y-6">
          {showLensDock ? (
            <div>
              {lensNode ? (
                <V2IntelligenceLens
                  node={lensNode}
                  source={TAB_SOURCE[intelTab]}
                  onClose={() => setLensId(null)}
                  variant="dock"
                />
              ) : (
                <V2IntelligenceLensEmpty />
              )}
            </div>
          ) : null}

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
              <V2SectionTitle>Tags</V2SectionTitle>
              <V2TagCloud tags={tags.slice(0, 16)} />
            </V2Card>
          </div>

          <V2Card className="hidden p-5 xl:block">
            <V2SectionTitle>Recent activity</V2SectionTitle>
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
          <V2SectionTitle>Recent activity</V2SectionTitle>
          <V2Timeline entries={homeTimeline} compact />
        </V2Card>
      ) : null}
    </>
  );
}
