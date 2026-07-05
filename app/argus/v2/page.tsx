import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";
import {
  buildV2EntityRows,
  buildV2FollowUps,
  buildV2HomeStats,
  buildV2HomeTimeline,
  buildV2RecentActivity,
  buildV2TagCloud,
} from "@/lib/argus/v2/loaders";
import { V2Card, V2SectionTitle } from "./components/v2-ui";
import { V2Timeline, V2TimelineRail } from "./components/V2Timeline";
import { V2EntityTable } from "./components/V2EntityTable";

const STAT_ICONS: Record<string, string> = {
  journal: "📓",
  email: "✉",
  people: "👤",
  org: "🏢",
  project: "📁",
};

const ACTIVITY_ICONS: Record<string, string> = {
  journal: "📓",
  email: "✉",
  meeting: "📅",
};

const TAG_COLORS: Record<string, string> = {
  violet: "bg-violet-500/15 text-violet-300 ring-violet-500/25",
  emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  sky: "bg-sky-500/15 text-sky-300 ring-sky-500/25",
  orange: "bg-orange-500/15 text-orange-300 ring-orange-500/25",
};

export default async function V2HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab =
    tabParam === "projects" || tabParam === "people" ? tabParam : ("organizations" as const);

  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const entities = data.entities.filter((e) => !e.deletedAt);

  const stats = buildV2HomeStats(data, inboxItems, today);
  const recentActivity = buildV2RecentActivity(data, entities, includePrivate, today);
  const followUps = buildV2FollowUps(data, includePrivate, today);
  const homeTimeline = buildV2HomeTimeline(data, inboxItems, includePrivate);
  const entityRows = buildV2EntityRows(data, inboxItems, includePrivate, today, tab);
  const tags = buildV2TagCloud(data, includePrivate);

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Home</h1>
        <p className="mt-1 text-sm text-zinc-500">Overview of your knowledge base · live counts</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <V2Card key={stat.label} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-lg">{STAT_ICONS[stat.icon]}</span>
              <span className="text-[10px] text-emerald-400">{stat.delta}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-zinc-50">{stat.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
          </V2Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_280px]">
        <div className="space-y-6 xl:col-span-2">
          <V2Card className="p-5">
            <V2SectionTitle
              action={
                <Link href="/argus/journal" className="text-xs text-violet-400 hover:text-violet-300">
                  View all
                </Link>
              }
            >
              Recent Activity
            </V2SectionTitle>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-zinc-500">No journal activity yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-800/80">
                {recentActivity.map((item) => (
                  <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-0.5 text-lg">{ACTIVITY_ICONS[item.kind]}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={item.href} className="text-sm font-medium text-zinc-200 hover:text-violet-300">
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-zinc-500">{item.meta}</p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-600">{item.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle>Follow Ups</V2SectionTitle>
            {followUps.length === 0 ? (
              <p className="text-sm text-zinc-500">No pending follow-ups.</p>
            ) : (
              <ul className="space-y-3">
                {followUps.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40 px-3 py-3"
                  >
                    <Link href={item.href} className="text-sm text-zinc-300 hover:text-violet-300">
                      {item.title}
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        item.tone === "danger"
                          ? "bg-red-500/15 text-red-300"
                          : item.tone === "warning"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item.due}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle>Recent Entities</V2SectionTitle>
            <V2EntityTable tab={tab} rows={entityRows} />
          </V2Card>
        </div>

        <div className="space-y-6">
          <V2Card className="hidden p-5 xl:block">
            <V2SectionTitle>Timeline</V2SectionTitle>
            {homeTimeline.length === 0 ? (
              <p className="text-sm text-zinc-500">No timeline entries yet.</p>
            ) : (
              <V2TimelineRail entries={homeTimeline} />
            )}
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle>Tags</V2SectionTitle>
            {tags.length === 0 ? (
              <p className="text-sm text-zinc-500">Tags appear on journal entries.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.name}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${TAG_COLORS[tag.color]}`}
                  >
                    {tag.name}
                    <span className="opacity-60">{tag.count}</span>
                  </span>
                ))}
              </div>
            )}
          </V2Card>
        </div>
      </div>

      {homeTimeline.length > 0 ? (
        <V2Card className="mt-6 p-5 xl:hidden">
          <V2SectionTitle>Timeline</V2SectionTitle>
          <V2Timeline entries={homeTimeline} compact />
        </V2Card>
      ) : null}
    </div>
  );
}
