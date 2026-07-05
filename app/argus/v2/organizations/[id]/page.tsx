import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { STRATEGIC_VALUE_LABELS } from "@/lib/argus/labels";
import { entityNotesForDisplay } from "@/lib/argus/reference-types";
import { getEntity, getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { loadOrganizationPageData } from "@/lib/argus/v2/loaders";
import { V2Badge, V2BackLink, V2Card, V2SectionTitle } from "../../components/v2-ui";
import { V2OrgTabs } from "../../components/V2OrgTabs";
import { V2OrgTimeline } from "../../components/V2OrgTimeline";
import { V2RelationshipChart } from "../../components/V2RelationshipChart";
import { EmptyState } from "@/app/argus/components/ui";

const TIMELINE_PREVIEW = 8;

export default async function V2OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const entity = await getEntity(id);

  if (!entity || entity.type !== "company") {
    return (
      <div className="px-4 py-6 lg:px-8">
        <V2BackLink href="/argus/v2/browse/organizations">Back to Organizations</V2BackLink>
        <EmptyState message="Organization not found." />
      </div>
    );
  }

  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const page = loadOrganizationPageData(data, inboxItems, entity, includePrivate, today);
  const notes = entityNotesForDisplay(entity.notes ?? "");
  const sv = entity.strategicValue ?? 3;
  const sinceYear = entity.createdAt?.slice(0, 4) ?? "—";
  const morePeople = Math.max(0, page.linkedPeople.length - 4);
  const moreProjects = Math.max(0, page.orgProjects.length - 3);

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mb-5">
        <V2BackLink href="/argus/v2/browse/organizations">Back to Organizations</V2BackLink>
      </div>

      {/* Profile header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-lg ring-1 ring-orange-500/30">
                🏢
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{entity.name}</h1>
              <Link
                href={`/argus/network/${entity.id}`}
                className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400"
                aria-label="Edit organization"
              >
                ✎
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
              {entity.alias ? <span>{entity.alias}</span> : null}
              {entity.alias && notes ? <span className="text-zinc-700">·</span> : null}
              {notes ? <span>{notes}</span> : null}
              {(entity.alias || notes) && <span className="text-zinc-700">·</span>}
              <V2Badge tone="green">Active</V2Badge>
              <span className="text-zinc-700">·</span>
              <span>Since {sinceYear}</span>
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

      <V2OrgTabs active="Overview" />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Stats row + contact pills */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              <OrgStatCard
                value={String(page.stats.journalEntries)}
                label="Journal Entries"
                delta={page.stats.journalDelta}
              />
              <OrgStatCard value={String(page.stats.emails)} label="Emails" delta={page.stats.emailsDelta} />
              <OrgStatCard
                value={String(page.stats.people)}
                label="People"
                linkHref={`/argus/network/${entity.id}`}
                linkLabel="View all"
              />
              <OrgStatCard
                value={String(page.stats.projects)}
                label="Projects"
                linkHref="/argus/v2/browse/projects"
                linkLabel="View all"
              />
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:w-44">
              <V2Card className="flex flex-1 flex-col justify-center px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">First contact</p>
                <p className="mt-1 text-sm font-medium text-zinc-200">{page.stats.firstContact}</p>
              </V2Card>
              <V2Card className="flex flex-1 flex-col justify-center px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Last activity</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-zinc-200">
                  {page.stats.isActiveToday ? (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  ) : null}
                  {page.stats.lastActivity}
                </p>
              </V2Card>
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
        </div>

        {/* Right sidebar */}
        <aside className="space-y-5">
          <V2Card className="p-5">
            <V2SectionTitle>Relationship Performance</V2SectionTitle>
            <div className="mb-1 flex items-end gap-1.5">
              <span className="text-4xl font-bold tabular-nums text-zinc-50">{sv}</span>
              <span className="pb-1 text-sm text-zinc-500">/ 5</span>
            </div>
            <p className="mb-4 text-sm font-medium text-emerald-400">
              {STRATEGIC_VALUE_LABELS[sv as 1 | 2 | 3 | 4 | 5]}
            </p>
            <V2RelationshipChart points={page.sparkline} />
            <ul className="space-y-2.5 border-t border-zinc-800/80 pt-4">
              {page.relationshipMetrics.map((m) => (
                <li key={m.label} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{m.label}</span>
                  <span className="font-medium text-emerald-400">{m.value}</span>
                </li>
              ))}
            </ul>
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle>Key People</V2SectionTitle>
            {page.linkedPeople.length === 0 ? (
              <p className="text-sm text-zinc-500">Link people on the organization record.</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {page.linkedPeople.slice(0, 4).map((person, index) => (
                    <li key={person.id} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/40 to-zinc-700 text-xs font-bold text-violet-100">
                        {initials(person.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/argus/network/${person.id}`}
                            className="text-sm font-medium text-zinc-200 hover:text-violet-300"
                          >
                            {person.name}
                          </Link>
                          {index === 0 ? <V2Badge tone="purple">Primary Contact</V2Badge> : null}
                        </div>
                        <p className="truncate text-xs text-zinc-500">{person.alias || "Contact"}</p>
                      </div>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="Active" />
                    </li>
                  ))}
                </ul>
                {morePeople > 0 ? (
                  <p className="mt-3 text-xs text-violet-400">+{morePeople} more people</p>
                ) : null}
              </>
            )}
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle>Recent Projects</V2SectionTitle>
            {page.recentProjects.length === 0 ? (
              <p className="text-sm text-zinc-500">Link this org on a project record.</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {page.recentProjects.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`/argus/v2/projects/${project.id}`}
                        className="flex items-start gap-3 rounded-xl border border-zinc-800/60 p-3 transition hover:border-zinc-700"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-base text-sky-400">
                          📁
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-200 line-clamp-2">{project.name}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <V2Badge tone={project.status === "Completed" ? "green" : "blue"}>
                              {project.status}
                            </V2Badge>
                            <span className="text-xs text-zinc-600">{project.year}</span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                {moreProjects > 0 ? (
                  <p className="mt-3 text-xs text-violet-400">+{moreProjects} more projects</p>
                ) : null}
              </>
            )}
          </V2Card>

          <V2Card className="p-5">
            <Link href={`/argus/network/${entity.id}`} className="text-sm text-violet-400 hover:text-violet-300">
              Open legacy network view →
            </Link>
          </V2Card>
        </aside>
      </div>
    </div>
  );
}

function OrgStatCard({
  value,
  label,
  delta,
  linkHref,
  linkLabel,
}: {
  value: string;
  label: string;
  delta?: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <V2Card className="flex flex-col p-4">
      <p className="text-2xl font-bold tabular-nums text-zinc-50">{value}</p>
      {delta ? <p className="mt-1 text-[10px] text-emerald-400">{delta}</p> : null}
      <p className="mt-2 text-xs text-zinc-500">{label}</p>
      {linkHref && linkLabel ? (
        <Link href={linkHref} className="mt-1 text-[10px] text-violet-400 hover:text-violet-300">
          {linkLabel}
        </Link>
      ) : null}
    </V2Card>
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
