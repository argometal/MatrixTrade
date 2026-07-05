import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { entityNotesForDisplay } from "@/lib/argus/reference-types";
import { getEntity, getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { loadProjectPageData } from "@/lib/argus/v2/loaders";
import { V2Badge, V2BackLink, V2Card, V2SectionTitle } from "../../components/v2-ui";
import { V2Timeline } from "../../components/V2Timeline";
import { EmptyState, formatDate } from "@/app/argus/components/ui";

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
  const page = loadProjectPageData(data, inboxItems, entity, includePrivate);
  const notes = entityNotesForDisplay(entity.notes ?? "");

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mb-4">
        <V2BackLink href="/argus/v2/browse/projects">Back to Projects</V2BackLink>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-zinc-50">{entity.name}</h1>
          <div className="flex flex-wrap gap-2">
            {entity.startDate ? (
              <V2Badge tone="default">
                {formatDate(entity.startDate)} – {entity.endDate ? formatDate(entity.endDate) : "open"}
              </V2Badge>
            ) : null}
            {page.org ? <V2Badge tone="orange">{page.org.name}</V2Badge> : null}
          </div>
        </div>
      </div>

      <p className="mb-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
        <strong className="text-zinc-400">Project scope:</strong> timeline includes evidence linked to the project{" "}
        <em>and</em> to project contacts within{" "}
        <code className="text-zinc-400">startDate–endDate</code> (
        {page.scope.directLogs.length + page.scope.directInbox.length} direct ·{" "}
        {page.scope.viaContactLogs.length + page.scope.viaContactInbox.length} via contacts).
      </p>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatMini
              label="Duration"
              value={page.durationDays ? `${page.durationDays} days` : "—"}
              sub={
                entity.startDate
                  ? `${formatDate(entity.startDate)} – ${entity.endDate ? formatDate(entity.endDate) : "open"}`
                  : undefined
              }
            />
            <StatMini label="People" value={String(page.stats.people)} />
            <StatMini label="Journal Entries" value={String(page.stats.journalEntries)} />
            <StatMini label="Emails" value={String(page.stats.emails)} />
            <StatMini label="Attachments" value={String(page.stats.files)} />
          </div>

          <V2Card className="p-5">
            <V2SectionTitle>Project Timeline</V2SectionTitle>
            <p className="mb-5 text-xs text-zinc-500">
              Bounded by project dates · chronological · Log vs Note from journal kind
            </p>
            {page.timeline.length === 0 ? (
              <p className="text-sm text-zinc-500">No project-scoped evidence yet.</p>
            ) : (
              <V2Timeline entries={page.timeline} />
            )}
          </V2Card>
        </div>

        <aside className="space-y-5">
          {notes ? (
            <V2Card className="p-5">
              <V2SectionTitle>About</V2SectionTitle>
              <p className="text-sm leading-relaxed text-zinc-400">{notes}</p>
            </V2Card>
          ) : null}

          <V2Card className="p-5">
            <V2SectionTitle>People on project</V2SectionTitle>
            {page.linkedPeople.length === 0 ? (
              <p className="text-sm text-zinc-500">Add people via project links.</p>
            ) : (
              <ul className="space-y-3">
                {page.linkedPeople.map((person) => (
                  <li key={person.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600/20 text-[10px] font-bold text-sky-200">
                      {person.name
                        .split(/\s+/)
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/argus/network/${person.id}`}
                        className="text-sm font-medium text-zinc-200 hover:text-violet-300"
                      >
                        {person.name}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </V2Card>

          {page.org ? (
            <V2Card className="p-5">
              <V2SectionTitle>Organization</V2SectionTitle>
              <Link
                href={`/argus/v2/organizations/${page.org.id}`}
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                {page.org.name}
              </Link>
            </V2Card>
          ) : null}

          <V2Card className="p-5">
            <V2SectionTitle>Production page</V2SectionTitle>
            <Link href={`/argus/projects/${entity.id}`} className="text-sm text-violet-400 hover:text-violet-300">
              Open legacy project view →
            </Link>
          </V2Card>
        </aside>
      </div>
    </div>
  );
}

function StatMini({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <V2Card className="p-4">
      <p className="text-xl font-bold tabular-nums text-zinc-50">{value}</p>
      {sub ? <p className="mt-1 text-[10px] leading-snug text-zinc-600">{sub}</p> : null}
      <p className="mt-2 text-xs text-zinc-500">{label}</p>
    </V2Card>
  );
}
