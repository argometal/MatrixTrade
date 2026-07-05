import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { entityNotesForDisplay } from "@/lib/argus/reference-types";
import { getEntity, getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { loadProjectPageData } from "@/lib/argus/v2/loaders";
import { V2Badge, V2BackLink, V2Card } from "../../components/v2-ui";
import { V2OrgTimeline } from "../../components/V2OrgTimeline";
import { V2ProjectTabs } from "../../components/V2ProjectTabs";
import {
  V2LegacyLink,
  V2LinkedEntityRow,
  V2MetricRows,
  V2MorePeopleHint,
  V2PanelCard,
  V2PanelHeader,
  V2PanelLinkAction,
  V2PersonListItem,
} from "../../components/V2RightPanel";
import { EmptyState, formatDate } from "@/app/argus/components/ui";

const TIMELINE_PREVIEW = 8;

export default async function V2ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const entity = await getEntity(id);

  if (!entity || entity.type !== "project") {
    return (
      <div className="px-4 py-6 lg:px-8">
        <V2BackLink href="/argus/v2/browse/projects">Back to Projects</V2BackLink>
        <EmptyState message="Project not found." />
      </div>
    );
  }

  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const page = loadProjectPageData(data, inboxItems, entity, includePrivate, today);
  const notes = entityNotesForDisplay(entity.notes ?? "");
  const morePeople = Math.max(0, page.peopleWithRoles.length - 4);
  const statusTone =
    page.status === "Completed" ? "green" : page.status === "In Progress" ? "blue" : "amber";

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mb-5">
        <V2BackLink href="/argus/v2/browse/projects">Back to Projects</V2BackLink>
      </div>

      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{entity.name}</h1>
              <Link
                href={`/argus/projects/${entity.id}`}
                className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400"
                aria-label="Edit project"
              >
                ✎
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <V2Badge tone={statusTone}>{page.status}</V2Badge>
              {page.dateRangeLabel ? <V2Badge tone="default">{page.dateRangeLabel}</V2Badge> : null}
              {page.org ? (
                <Link href={`/argus/v2/organizations/${page.org.id}`}>
                  <V2Badge tone="orange">{page.org.name}</V2Badge>
                </Link>
              ) : null}
              {entity.alias ? <V2Badge tone="blue">{entity.alias}</V2Badge> : null}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              Share
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400 hover:border-zinc-600"
              aria-label="More options"
            >
              ···
            </button>
          </div>
        </div>
      </header>

      <V2ProjectTabs active="Overview" />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <ProjectStatCard
              value={page.durationDays ? `${page.durationDays} days` : "—"}
              label="Duration"
              sub={
                entity.startDate
                  ? `${formatDate(entity.startDate)} – ${entity.endDate ? formatDate(entity.endDate) : "open"}`
                  : undefined
              }
            />
            <ProjectStatCard
              value={String(page.stats.people)}
              label="People"
              linkLabel="View all"
              linkHref={`/argus/projects/${entity.id}`}
            />
            <ProjectStatCard
              value={String(page.stats.journalEntries)}
              label="Journal Entries"
              linkLabel="View timeline"
            />
            <ProjectStatCard
              value={String(page.stats.emails)}
              label="Emails"
              linkLabel="View emails"
            />
            <ProjectStatCard
              value={String(page.stats.files)}
              label="Files"
              linkLabel="View files"
            />
          </div>

          {/* Timeline */}
          <V2Card className="p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Project Timeline</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Bounded by project dates · direct links + via project contacts
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-400"
                >
                  All types ▾
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-400"
                >
                  Filters
                </button>
              </div>
            </div>
            <V2OrgTimeline entries={page.timeline} limit={TIMELINE_PREVIEW} />
          </V2Card>
        </div>

        {/* Right sidebar — mockup layout */}
        <aside className="space-y-4">
          <V2PanelCard>
            <V2PanelHeader title="About this project" editHref={`/argus/projects/${entity.id}`} />
            {notes ? (
              <p className="text-sm leading-relaxed text-zinc-400">{notes}</p>
            ) : (
              <p className="text-sm text-zinc-500">Add a description on the project record.</p>
            )}
          </V2PanelCard>

          <V2PanelCard>
            <V2PanelHeader
              title="People on this project"
              action={
                page.peopleWithRoles.length > 0 ? (
                  <V2PanelLinkAction href={`/argus/projects/${entity.id}`}>View all</V2PanelLinkAction>
                ) : undefined
              }
            />
            {page.peopleWithRoles.length === 0 ? (
              <p className="text-sm text-zinc-500">Add people via project links.</p>
            ) : (
              <>
                <ul className="space-y-4">
                  {page.peopleWithRoles.slice(0, 4).map((person) => (
                    <V2PersonListItem
                      key={person.id}
                      href={`/argus/network/${person.id}`}
                      name={person.name}
                      subtitle={person.role}
                      initials={person.initials}
                    />
                  ))}
                </ul>
                <V2MorePeopleHint people={page.peopleWithRoles.slice(4)} moreCount={morePeople} />
              </>
            )}
          </V2PanelCard>

          <V2PanelCard>
            <V2PanelHeader title="Key metrics" />
            <V2MetricRows metrics={page.keyMetrics} />
          </V2PanelCard>

          <V2PanelCard>
            <V2PanelHeader title="Linked entities" />
            <div className="space-y-2.5">
              {page.org ? (
                <V2LinkedEntityRow
                  kind="organization"
                  label="Organization"
                  href={`/argus/v2/organizations/${page.org.id}`}
                  value={page.org.name}
                />
              ) : null}
              {page.linkedTopics.length > 0 ? (
                <V2LinkedEntityRow kind="topics" label="Topics" tags={page.linkedTopics} />
              ) : null}
              {page.linkedEventsCount > 0 ? (
                <V2LinkedEntityRow
                  kind="events"
                  label="Events"
                  value={`${page.linkedEventsCount} events`}
                />
              ) : null}
              {!page.org && page.linkedTopics.length === 0 && page.linkedEventsCount === 0 ? (
                <p className="text-sm text-zinc-500">Link org, topics, or events on the project.</p>
              ) : null}
            </div>
          </V2PanelCard>

          <V2LegacyLink href={`/argus/projects/${entity.id}`}>Open legacy project view →</V2LegacyLink>
        </aside>
      </div>
    </div>
  );
}

function ProjectStatCard({
  value,
  label,
  sub,
  linkLabel,
  linkHref,
}: {
  value: string;
  label: string;
  sub?: string;
  linkLabel?: string;
  linkHref?: string;
}) {
  return (
    <V2Card className="flex flex-col p-4">
      <p className="text-xl font-bold tabular-nums text-zinc-50">{value}</p>
      {sub ? <p className="mt-1 text-[10px] leading-snug text-zinc-600">{sub}</p> : null}
      <p className="mt-2 text-xs text-zinc-500">{label}</p>
      {linkLabel ? (
        linkHref ? (
          <Link href={linkHref} className="mt-1 text-[10px] text-violet-400 hover:text-violet-300">
            {linkLabel}
          </Link>
        ) : (
          <p className="mt-1 text-[10px] text-violet-400">{linkLabel}</p>
        )
      ) : null}
    </V2Card>
  );
}
