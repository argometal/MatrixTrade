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
  parseV2EntityTab,
} from "@/lib/argus/v2/loaders";
import { V2Card, V2SectionTitle } from "./components/v2-ui";
import { V2Timeline, V2TimelineRail } from "./components/V2Timeline";
import { V2TagCloud } from "./components/V2TagCloud";
import { V2EntityTable } from "./components/V2EntityTable";

const STAT_ICONS: Record<string, string> = {
  journal: "📓",
  email: "✉",
  people: "👤",
  org: "🏢",
  project: "📁",
};

function V2HomeStatCard({ stat }: { stat: { label: string; value: string; delta: string; icon: string; href: string } }) {
  return (
    <Link
      href={stat.href}
      className="group block rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 transition hover:border-violet-500/40 hover:bg-zinc-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-lg transition group-hover:scale-110">{STAT_ICONS[stat.icon]}</span>
        <span className="text-[10px] text-emerald-400">{stat.delta}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-zinc-50 group-hover:text-violet-100">{stat.value}</p>
      <p className="mt-1 text-xs text-zinc-500 group-hover:text-zinc-400">{stat.label}</p>
    </Link>
  );
}

const ACTIVITY_ICON_STYLES: Record<string, { icon: string; box: string }> = {
  journal: { icon: "📓", box: "bg-emerald-500/15 text-emerald-400" },
  email: { icon: "✉", box: "bg-zinc-700/50 text-zinc-300" },
  meeting: { icon: "📅", box: "bg-violet-500/15 text-violet-400" },
};

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
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = parseV2EntityTab(tabParam);

  const includePrivate = await hasArgusPrivateUnlock();
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const entities = data.entities.filter((e) => !e.deletedAt);

  const stats = buildV2HomeStats(data, inboxItems, today);
  const recentActivity = buildV2RecentActivity(data, entities, includePrivate, today);
  const followUps = buildV2FollowUps(data, entities, includePrivate, today);
  const homeTimeline = buildV2HomeTimeline(data, inboxItems, includePrivate);
  const entityRows = buildV2EntityRows(data, inboxItems, includePrivate, today, tab);
  const tags = buildV2TagCloud(data, inboxItems, includePrivate);

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Home</h1>
          <p className="mt-1 text-sm text-zinc-500">Overview of your knowledge base · live counts</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" id="stats">
        {stats.map((stat) => (
          <V2HomeStatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {/* Recent Activity + Follow Ups side by side (per mockup) */}
          <div className="grid gap-6 md:grid-cols-2">
            <V2Card className="flex flex-col p-5">
              <V2SectionTitle
                action={
                  <Link href="/argus/v2#stats" className="text-xs text-violet-400 hover:text-violet-300">
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
                  {recentActivity.map((item) => {
                    const style = ACTIVITY_ICON_STYLES[item.kind] ?? ACTIVITY_ICON_STYLES.journal;
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
                        <span className="shrink-0 text-xs text-zinc-600">{item.time}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </V2Card>

            <div id="follow-ups">
            <V2Card className="flex flex-col p-5">
              <V2SectionTitle
                action={
                  <Link href="/argus/v2#follow-ups" className="text-xs text-violet-400 hover:text-violet-300">
                    View all
                  </Link>
                }
              >
                Follow Ups
              </V2SectionTitle>
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
          </div>

          <V2Card className="p-5">
            <V2SectionTitle>Recent Entities</V2SectionTitle>
            <V2EntityTable tab={tab} rows={entityRows} />
          </V2Card>
        </div>

        <aside className="space-y-6">
          <V2Card className="hidden p-5 xl:block">
            <V2SectionTitle>Timeline</V2SectionTitle>
            {homeTimeline.length === 0 ? (
              <p className="text-sm text-zinc-500">No timeline entries yet.</p>
            ) : (
              <V2TimelineRail entries={homeTimeline} />
            )}
          </V2Card>

          <div id="tags">
          <V2Card className="p-5">
            <V2SectionTitle>Tags</V2SectionTitle>
            <V2TagCloud tags={tags} />
          </V2Card>
          </div>
        </aside>
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
