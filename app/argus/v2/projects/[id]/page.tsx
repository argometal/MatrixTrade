import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { entityNotesForDisplay } from "@/lib/argus/reference-types";
import { getEntity, getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { loadProjectPageData } from "@/lib/argus/v2/loaders";
import { V2Badge, V2BackLink, V2Card, V2SectionTitle } from "../../components/v2-ui";
import { V2OrgTimeline } from "../../components/V2OrgTimeline";
import { V2ProjectTabs } from "../../components/V2ProjectTabs";
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

        {/* Right sidebar */}
        <aside className="space-y-5">
          <V2Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-100">About this project</h2>
              <Link
                href={`/argus/projects/${entity.id}`}
                className="text-zinc-600 hover:text-zinc-400"
                aria-label="Edit description"
              >
                ✎
              </Link>
            </div>
            {notes ? (
              <p className="text-sm leading-relaxed text-zinc-400">{notes}</p>
            ) : (
              <p className="text-sm text-zinc-500">Add a description on the project record.</p>
            )}
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle
              action={
                page.peopleWithRoles.length > 0 ? (
                  <Link
                    href={`/argus/projects/${entity.id}`}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    View all
                  </Link>
                ) : undefined
              }
            >
              People on this project
            </V2SectionTitle>
            {page.peopleWithRoles.length === 0 ? (
              <p className="text-sm text-zinc-500">Add people via project links.</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {page.peopleWithRoles.slice(0, 4).map((person) => (
                    <li key={person.id} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-600/40 to-zinc-700 text-xs font-bold text-sky-100">
                        {person.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/argus/network/${person.id}`}
                          className="text-sm font-medium text-zinc-200 hover:text-violet-300"
                        >
                          {person.name}
                        </Link>
                        <p className="text-xs text-zinc-500">{person.role}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                {morePeople > 0 ? (
                  <p className="mt-3 text-xs text-violet-400">+{morePeople} more</p>
                ) : null}
              </>
            )}
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle>Key metrics</V2SectionTitle>
            <ul className="space-y-3">
              {page.keyMetrics.map((m) => (
                <li key={m.label} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{m.label}</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      m.highlight ? "text-emerald-400" : "text-zinc-100"
                    }`}
                  >
                    {m.value}
                  </span>
                </li>
              ))}
            </ul>
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle>Linked entities</V2SectionTitle>
            <ul className="space-y-3 text-sm">
              {page.org ? (
                <li>
                  <Link
                    href={`/argus/v2/organizations/${page.org.id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-800/60 px-3 py-2.5 hover:border-zinc-700"
                  >
                    <span className="text-zinc-500">Organization</span>
                    <span className="font-medium text-violet-300">{page.org.name} →</span>
                  </Link>
                </li>
              ) : null}
              {page.linkedTopics.length > 0 ? (
                <li className="rounded-lg border border-zinc-800/60 px-3 py-2.5">
                  <p className="mb-2 text-zinc-500">Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {page.linkedTopics.map((topic) => (
                      <V2Badge key={topic} tone="default">
                        {topic}
                      </V2Badge>
                    ))}
                  </div>
                </li>
              ) : null}
              {page.linkedEventsCount > 0 ? (
                <li className="flex items-center justify-between rounded-lg border border-zinc-800/60 px-3 py-2.5">
                  <span className="text-zinc-500">Events</span>
                  <span className="text-zinc-300">{page.linkedEventsCount} events →</span>
                </li>
              ) : null}
              {!page.org && page.linkedTopics.length === 0 && page.linkedEventsCount === 0 ? (
                <p className="text-sm text-zinc-500">Link org, topics, or events on the project.</p>
              ) : null}
            </ul>
          </V2Card>

          <V2Card className="p-5">
            <Link href={`/argus/projects/${entity.id}`} className="text-sm text-violet-400 hover:text-violet-300">
              Open legacy project view →
            </Link>
          </V2Card>
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
