import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { entityNotesForDisplay } from "@/lib/argus/reference-types";
import { getEntity, getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { loadOrganizationPageData } from "@/lib/argus/v2/loaders";
import { buildV2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { V2QuickDeliverButton } from "../../components/V2QuickDeliverModal";
import { resolveEntityLifecycleStatus } from "@/lib/argus/entity-lifecycle";
import { V2EntityLifecycleActions } from "../../components/V2EntityLifecycleActions";
import { V2TagPatternBadges } from "../../components/V2TagPatternBadges";
import { V2RecordRecentEntity } from "../../components/V2RecordRecentEntity";
import { V2Badge, V2BackLink, V2Card } from "../../components/v2-ui";
import { V2EntityNeighborhoodPanel } from "../../components/V2EntityNeighborhoodPanel";
import { V2EntityLinkButton } from "../../components/V2CreateEntityButton";
import { V2OrgTabs } from "../../components/V2OrgTabs";
import { V2OrgTimeline } from "../../components/V2OrgTimeline";
import { V2RelationshipChart } from "../../components/V2RelationshipChart";
import {
  V2ContactPill,
  V2LegacyLink,
  V2MetricRows,
  V2MorePeopleHint,
  V2PanelCard,
  V2PanelHeader,
  V2PanelLinkAction,
  V2PersonListItem,
  V2ProjectListItem,
  V2SummaryStatCard,
} from "../../components/V2RightPanel";
import { EmptyState } from "@/app/argus/components/ui";

const TIMELINE_PREVIEW = 8;

function extractWebsite(notes: string): string | null {
  const match = notes.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})/i);
  return match ? match[1].replace(/^www\./i, "") : null;
}

function extractLocation(notes: string): string | null {
  const lines = notes.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const candidate = lines[1];
  if (candidate.length > 80 || /^https?:\/\//i.test(candidate)) return null;
  return candidate;
}

export default async function V2OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const entity = await getEntity(id);

  if (!entity || entity.type !== "company") {
    return (
      <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="px-4 py-6 lg:px-8">
            <V2BackLink href="/argus/v2/browse/organizations">Back to Organizations</V2BackLink>
            <EmptyState message="Organization not found." />
          </div>
        </div>
      </div>
    );
  }

  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const page = loadOrganizationPageData(data, inboxItems, entity, includePrivate, today);
  const neighborhood = buildV2EntityNeighborhoodGraph(data, inboxItems, entity.id, includePrivate, today);
  const notes = entityNotesForDisplay(entity.notes ?? "");
  const sinceYear = entity.createdAt?.slice(0, 4) ?? "—";
  const website = extractWebsite(entity.notes ?? "");
  const location = extractLocation(entity.notes ?? "");
  const morePeople = Math.max(0, page.linkedPeople.length - 4);
  const moreProjects = Math.max(0, page.orgProjects.length - 3);
  const lifecycleStatus = resolveEntityLifecycleStatus(entity, today);

  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <V2RecordRecentEntity
        id={entity.id}
        kind="organization"
        label={entity.name}
        href={`/argus/v2/organizations/${entity.id}`}
      />
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 py-6 lg:px-8">
      <div className="mb-5">
        <V2BackLink href="/argus/v2/browse/organizations">Back to Organizations</V2BackLink>
      </div>

      {/* Profile header — org mockup */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-xl ring-1 ring-orange-500/30">
                🏢
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{entity.name}</h1>
              <Link
                href={`/argus/v2/network/${entity.id}`}
                className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-300"
                aria-label="Edit organization"
              >
                ✎
              </Link>
              <V2EntityLinkButton
                entityId={entity.id}
                linkedIds={entity.linkedEntityIds ?? []}
                className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25"
              />
              <V2QuickDeliverButton
                scopeType="organization"
                scopeId={entity.id}
                scopeName={entity.name}
                label="Deliver"
                className="rounded-lg border border-emerald-500/40 bg-emerald-600/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/25"
              />
              <Link
                href={`/argus/v2/deliver?scopeType=organization&scopeId=${entity.id}&package=evidence_vault`}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Full ZIP
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
              {entity.alias ? <span>{entity.alias}</span> : null}
              {entity.alias && notes ? <span className="text-zinc-700">·</span> : null}
              {notes ? <span>{notes.split("\n")[0]}</span> : null}
              {(entity.alias || notes) && <span className="text-zinc-700">·</span>}
              <V2Badge tone="green">Active</V2Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              {location ? (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>📍</span>
                  {location}
                </span>
              ) : null}
              {website ? (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>🌐</span>
                  {website}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>📅</span>
                Since {sinceYear}
              </span>
            </div>
            {page.tagPatterns.length > 0 ? (
              <V2TagPatternBadges
                patterns={page.tagPatterns}
                className="mt-3"
                tagHref={(tag) =>
                  `/argus/v2/browse/topics?tag=${encodeURIComponent(tag)}&org=${entity.id}`
                }
              />
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <V2EntityLifecycleActions
              entityId={entity.id}
              entityName={entity.name}
              entityKind="organization"
              lifecycleStatus={lifecycleStatus}
              returnTo={`/argus/v2/organizations/${entity.id}`}
              variant="inline"
            />
            <button
              type="button"
              className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
            >
              Share
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-600"
              aria-label="More options"
            >
              ···
            </button>
          </div>
        </div>
      </header>

      <V2OrgTabs active="Overview" />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Summary stat cards + contact pills */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <V2SummaryStatCard
                kind="email"
                value={String(page.stats.emails)}
                label="Emails"
                delta={page.stats.emailsDelta}
                href="/argus/v2/inbox"
              />
              <V2SummaryStatCard
                kind="people"
                value={String(page.stats.people)}
                label="People"
                href={`/argus/v2/network/${entity.id}`}
                linkLabel="View all"
              />
              <V2SummaryStatCard
                kind="projects"
                value={String(page.stats.projects)}
                label="Projects"
                href="/argus/v2/browse/projects"
                linkLabel="View all"
              />
              <V2SummaryStatCard
                kind="topics"
                value={String(page.stats.topics)}
                label="Topics"
                href="/argus/v2/browse/topics"
                linkLabel="Browse"
              />
              <V2SummaryStatCard
                kind="events"
                value={String(page.stats.events)}
                label="Events"
                href="/argus/v2/browse/events"
                linkLabel="Browse"
              />
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:w-44 lg:flex-col">
              <V2ContactPill label="First contact" value={page.stats.firstContact} />
              <V2ContactPill label="Last activity" value={page.stats.lastActivity} active={page.stats.isActiveToday} />
            </div>
          </div>

          {/* Timeline */}
          <V2Card className="p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Organization Timeline</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  All time · Chronological view of all interactions and knowledge
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

          <V2Card className="p-5 sm:p-6">
            <V2EntityNeighborhoodPanel graph={neighborhood} entityName={entity.name} />
          </V2Card>
        </div>

        {/* Right sidebar — org mockup */}
        <aside className="space-y-4">
          <V2PanelCard>
            <V2PanelHeader title="Relationship Performance" />
            <div className="mb-1 flex items-end gap-1.5">
              <span className="text-4xl font-bold tabular-nums text-zinc-50">{page.relationshipScore}</span>
              <span className="pb-1 text-sm text-zinc-500">/ 5</span>
            </div>
            <p className="mb-4 text-sm font-semibold text-emerald-400">{page.relationshipLabel}</p>
            <V2RelationshipChart
              points={page.sparkline}
              startYear={page.chartStartYear}
              endYear={page.chartEndYear}
            />
            <div className="border-t border-zinc-800/80 pt-4">
              <V2MetricRows
                metrics={page.relationshipMetrics.map((m) => ({
                  label: m.label,
                  value: m.value,
                  highlight: m.value === "High" || m.value === "Strong",
                }))}
              />
            </div>
          </V2PanelCard>

          <V2PanelCard>
            <V2PanelHeader
              title="Key People"
              action={
                page.linkedPeople.length > 0 ? (
                  <V2PanelLinkAction href={`/argus/v2/network/${entity.id}`}>View all</V2PanelLinkAction>
                ) : undefined
              }
            />
            {page.linkedPeople.length === 0 ? (
              <p className="text-sm text-zinc-500">Link people on the organization record.</p>
            ) : (
              <>
                <ul className="space-y-4">
                  {page.linkedPeople.slice(0, 4).map((person, index) => (
                    <V2PersonListItem
                      key={person.id}
                      href={`/argus/v2/network/${person.id}`}
                      name={person.name}
                      subtitle={person.alias || "Contact"}
                      initials={initials(person.name)}
                      badge={
                        index === 0 ? (
                          <V2Badge tone="purple">Primary Contact</V2Badge>
                        ) : (
                          <V2Badge tone="default">Contact</V2Badge>
                        )
                      }
                      active
                    />
                  ))}
                </ul>
                <V2MorePeopleHint
                  people={page.linkedPeople.slice(4).map((p) => ({ initials: initials(p.name) }))}
                  moreCount={morePeople}
                />
              </>
            )}
          </V2PanelCard>

          <V2PanelCard>
            <V2PanelHeader
              title="Recent Projects"
              action={
                page.recentProjects.length > 0 ? (
                  <V2PanelLinkAction href="/argus/v2/browse/projects">View all</V2PanelLinkAction>
                ) : undefined
              }
            />
            {page.recentProjects.length === 0 ? (
              <p className="text-sm text-zinc-500">Link this org on a project record.</p>
            ) : (
              <>
                <ul className="space-y-2.5">
                  {page.recentProjects.map((project) => (
                    <li key={project.id}>
                      <V2ProjectListItem
                        href={`/argus/v2/projects/${project.id}`}
                        name={project.name}
                        status={project.status}
                        year={project.year}
                        statusTone={project.status === "Completed" ? "green" : "blue"}
                      />
                    </li>
                  ))}
                </ul>
                {moreProjects > 0 ? (
                  <p className="mt-3 text-xs font-medium text-violet-400">+{moreProjects} more projects</p>
                ) : null}
              </>
            )}
          </V2PanelCard>

          <V2LegacyLink href={`/argus/v2/network/${entity.id}`}>Open legacy network view →</V2LegacyLink>
        </aside>
      </div>
        </div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
