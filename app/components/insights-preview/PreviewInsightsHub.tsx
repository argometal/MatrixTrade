import Link from "next/link";
import { PreviewJournal } from "@/app/components/journal-preview/PreviewJournal";
import { PreviewMistakes } from "@/app/components/mistakes-preview/PreviewMistakes";
import { PreviewPipelinePerformance } from "@/app/components/insights-preview/PreviewPipelinePerformance";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";
import {
  PreviewStats,
  type PreviewStatsData,
} from "@/app/components/stats-preview/PreviewStats";
import type { PipelinePerformanceInput } from "@/lib/insights-pipeline-performance";
import type { InsightsCaseRow } from "@/lib/insights-case-spine-types";
import type { MistakeStat } from "@/lib/review";
import type { Playbook } from "@/lib/playbook-types";
import type { Trade } from "@/lib/types";

export type InsightsTabId =
  | "stats"
  | "journal"
  | "mistakes"
  | "pipeline";

const TABS: { id: InsightsTabId; label: string; href: string }[] = [
  { id: "stats", label: "Statistics", href: "/mxt/stats" },
  { id: "journal", label: "Journal", href: "/mxt/stats?tab=journal" },
  { id: "mistakes", label: "Mistakes", href: "/mxt/stats?tab=mistakes" },
  {
    id: "pipeline",
    label: "Pipeline Performance",
    href: "/mxt/stats?tab=pipeline",
  },
];

export function PreviewInsightsHub({
  tab,
  statsData,
  closed,
  playbooks,
  mistakeStats,
  trades,
  pipelineInput,
  caseSpine = [],
}: {
  tab: InsightsTabId;
  statsData: PreviewStatsData;
  closed: Trade[];
  playbooks: Playbook[];
  mistakeStats: MistakeStat[];
  trades: Trade[];
  pipelineInput: Omit<PipelinePerformanceInput, "filters">;
  caseSpine?: InsightsCaseRow[];
}) {
  const subtitles: Record<InsightsTabId, string> = {
    stats: "Cycle metrics — decide what to improve next.",
    journal: "Closed trades, lessons, and review notes — your trading log.",
    mistakes: "What errors cost you money — tagged in trade reviews.",
    pipeline:
      "Results by pipeline component — realized Trade P/L separate from Scout counterfactuals.",
  };

  return (
    <PageHelpPanel pageId="insights">
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Insights</h1>
              <p className="mt-0.5 text-sm text-zinc-500">{subtitles[tab]}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {TABS.map(({ id, label, href }) => (
                <Link
                  key={id}
                  href={href}
                  data-insights-tab={id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    tab === id
                      ? "bg-violet-600/20 text-violet-300"
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </header>

          {tab === "stats" && <PreviewStats data={statsData} embedded />}
          {tab === "journal" && (
            <PreviewJournal closed={closed} playbooks={playbooks} embedded />
          )}
          {tab === "mistakes" && (
            <PreviewMistakes stats={mistakeStats} trades={trades} embedded />
          )}
          {tab === "pipeline" && (
            <PreviewPipelinePerformance
              input={pipelineInput}
              playbooks={playbooks.map((p) => ({ id: p.id, name: p.name }))}
              caseSpine={caseSpine}
            />
          )}
        </div>
      </div>
    </PageHelpPanel>
  );
}
