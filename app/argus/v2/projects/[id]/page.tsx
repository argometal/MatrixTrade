import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { entityNotesForDisplay } from "@/lib/argus/reference-types";
import { getEntity, getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { runbooksForEntity } from "@/lib/argus/runbook-helpers";
import { loadProjectPageData } from "@/lib/argus/v2/loaders";
import { buildV2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { projectHasPrivateEvidence } from "@/lib/argus/v2/project-private";
import { V2QuickDeliverButton } from "../../components/V2QuickDeliverModal";
import { V2TagPatternBadges } from "../../components/V2TagPatternBadges";
import { V2RecordRecentEntity } from "../../components/V2RecordRecentEntity";
import { V2Badge, V2BackLink, V2Card } from "../../components/v2-ui";
import { V2EntityNeighborhoodPanel } from "../../components/V2EntityNeighborhoodPanel";
import { V2EntityLifecycleActions } from "../../components/V2EntityLifecycleActions";
import { V2ProjectScopeToggle } from "../../components/V2ProjectScopeToggle";
import { V2EntityLinkButton } from "../../components/V2CreateEntityButton";
import { V2OrgTimeline } from "../../components/V2OrgTimeline";
import { V2ProjectTabs } from "../../components/V2ProjectTabs";
import { V2ProjectRunbooksPanel } from "../../components/V2ProjectRunbooksPanel";
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

export default async function V2ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const { id } = await params;
  const { scope } = await searchParams;
  const respectProjectDates = scope !== "all";
  const includePrivate = await hasArgusPrivateUnlock();
  const entity = await getEntity(id);

  if (!entity || entity.type !== "project") {
    return (
      <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="px-4 py-6 lg:px-8">
            <V2BackLink href="/argus/v2/browse/projects">Back to Projects</V2BackLink>
            <EmptyState message="Project not found." />
          </div>
        </div>
      </div>
    );
  }

  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const page = loadProjectPageData(data, inboxItems, entity, includePrivate, today, {
    respectProjectDates,
  });
  const neighborhood = buildV2EntityNeighborhoodGraph(data, inboxItems, entity.id, includePrivate, today);
  const projectRunbooks = runbooksForEntity(data.runbooks ?? [], entity.id);
  const hasPrivateEvidence = projectHasPrivateEvidence(data, inboxItems, entity);
  const notes = entityNotesForDisplay(entity.notes ?? "");
  const morePeople = Math.max(0, page.peopleWithRoles.length - 4);
  const statusTone =
    page.status === "Completed" ? "green" : page.status === "In Progress" ? "blue" : "amber";

  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <V2RecordRecentEntity
        id={entity.id}
        kind="project"
        label={entity.name}
        href={`/argus/v2/projects/${entity.id}`}
      />
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
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
            {page.tagPatterns.length > 0 ? (
              <V2TagPatternBadges
                patterns={page.tagPatterns}
                className="mt-3"
                tagHref={(tag) =>
                  `/argus/v2/browse/topics?tag=${encodeURIComponent(tag)}&project=${entity.id}`
                }
              />
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <V2EntityLifecycleActions
              entityId={entity.id}
              entityName={entity.name}
              entityKind="project"
              lifecycleStatus={entity.lifecycleStatus}
              returnTo={`/argus/v2/projects/${entity.id}${respectProjectDates ? "" : "?scope=all"}`}
              hasPrivateEvidence={hasPrivateEvidence}
              privateConfigured={argusPrivateConfigured()}
              privateUnlocked={includePrivate}
              showDelete
              variant="inline"
            />
            <V2EntityLinkButton
              entityId={entity.id}
              linkedIds={entity.linkedEntityIds ?? []}
              className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25"
            />
            <V2QuickDeliverButton
              scopeType="project"
              scopeId={entity.id}
              scopeName={entity.name}
              label="Deliver"
              className="rounded-xl border border-emerald-500/40 bg-emerald-600/15 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-600/25"
            />
            <Link
              href={`/argus/v2/deliver?scopeType=project&scopeId=${entity.id}&package=evidence_vault`}
              className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-200"
            >
              Full ZIP
            </Link>
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
              value={String(page.stats.topics)}
              label="Topics"
              linkLabel="Browse topics"
              linkHref="/argus/v2/browse/topics"
            />
            <ProjectStatCard
              value={String(page.stats.events)}
              label="Events"
              linkLabel="Browse events"
              linkHref="/argus/v2/browse/events"
            />
            <ProjectStatCard
              value={page.org ? page.org.name : "—"}
              label="Organization"
              linkLabel={page.org ? "View org" : undefined}
              linkHref={page.org ? `/argus/v2/organizations/${page.org.id}` : undefined}
            />
            <ProjectStatCard
              value={String(page.stats.emails)}
              label="Emails"
              linkLabel="View inbox"
              linkHref="/argus/v2/inbox"
            />
          </div>

          {/* Timeline */}
          <V2Card className="p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Project Timeline</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {respectProjectDates
                    ? "Bounded by project dates · direct links + via project contacts"
                    : "All dates · includes evidence outside the project window"}
                </p>
              </div>
              <V2ProjectScopeToggle projectId={entity.id} respectDates={respectProjectDates} />
            </div>
            <V2OrgTimeline entries={page.timeline} limit={TIMELINE_PREVIEW} />
          </V2Card>

          <V2Card className="p-5 sm:p-6">
            <V2EntityNeighborhoodPanel graph={neighborhood} entityName={entity.name} />
          </V2Card>

          <V2ProjectRunbooksPanel runbooks={projectRunbooks} projectId={entity.id} />
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
                      href={`/argus/v2/network/${person.id}`}
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
