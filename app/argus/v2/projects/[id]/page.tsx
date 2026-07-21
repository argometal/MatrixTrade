import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { entityNotesForDisplay } from "@/lib/argus/reference-types";
import { getEntity, getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { libraryRunbooksForRelated, progressForEntity, runbooksForEntity } from "@/lib/argus/runbook-helpers";
import { loadProjectPageData } from "@/lib/argus/v2/loaders";
import { buildV2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { projectHasPrivateEvidence } from "@/lib/argus/v2/project-private";
import { parseIntelligenceFocus } from "@/lib/argus/v2/intelligence-nav";
import { buildV2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import { V2IntelligenceFocusBanner } from "../../components/V2IntelligenceFocusBanner";
import { V2QuickDeliverButton } from "../../components/V2QuickDeliverModal";
import { V2TagPatternBadges } from "../../components/V2TagPatternBadges";
import { V2RecordRecentEntity } from "../../components/V2RecordRecentEntity";
import { V2Badge, V2BackLink } from "../../components/v2-ui";
import { V2EntityLifecycleActions } from "../../components/V2EntityLifecycleActions";
import { V2EntityCreateButton, V2EntityLinkButton } from "../../components/V2CreateEntityButton";
import { V2ProjectShell } from "../../components/V2ProjectShell";
import { EmptyState } from "@/app/argus/components/ui";

export default async function V2ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ scope?: string; delete_error?: string; delete_auth_error?: string; totp_required?: string; error?: string; from?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { scope } = sp;
  const intelligenceFocus = parseIntelligenceFocus({
    get: (key) => sp[key as keyof typeof sp] ?? null,
  });
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
  const libraryRunbooks = libraryRunbooksForRelated(
    data.runbooks ?? [],
    page.org ? [page.org.id] : []
  );
  const progressRecords = progressForEntity(data.runbookProgress, entity.id);
  const hasPrivateEvidence = projectHasPrivateEvidence(data, inboxItems, entity);
  const deleteGate = await buildV2DeleteGateProps(entity, sp);
  const privateLocked = hasPrivateEvidence && !includePrivate;
  const returnTo = `/argus/v2/projects/${entity.id}${respectProjectDates ? "" : "?scope=all"}`;
  const notes = entityNotesForDisplay(entity.notes ?? "");
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
            {intelligenceFocus.from ? (
              <div className="mt-3">
                <V2IntelligenceFocusBanner
                  entityName={entity.name}
                  from={intelligenceFocus.from}
                  pathname={`/argus/v2/projects/${entity.id}`}
                  searchParams={new URLSearchParams(
                    Object.entries(sp)
                      .filter(([, v]) => v != null)
                      .map(([k, v]) => [k, String(v)])
                  )}
                  browseAllHref="/argus/v2/browse/projects"
                  browseAllLabel="Browse all projects"
                />
              </div>
            ) : null}
          </div>

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
                  returnTo={returnTo}
                  hasPrivateEvidence={hasPrivateEvidence}
                  privateConfigured={argusPrivateConfigured()}
                  privateUnlocked={includePrivate}
                  showDelete
                  variant="inline"
                  {...deleteGate}
                />
                <V2EntityLinkButton
                  entityId={entity.id}
                  linkedIds={entity.linkedEntityIds ?? []}
                  className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25"
                />
                <V2EntityCreateButton className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800" />
                <V2QuickDeliverButton
                  scopeType="project"
                  scopeId={entity.id}
                  scopeName={entity.name}
                  label="PDF"
                  className="rounded-xl border border-emerald-500/40 bg-emerald-600/15 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-600/25"
                />
                <Link
                  href={`/argus/v2/deliver?scopeType=project&scopeId=${entity.id}&package=pdf_deliver`}
                  className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-200"
                >
                  Deliver
                </Link>
              </div>
            </div>
          </header>

          <V2ProjectShell
            entity={entity}
            notes={notes}
            respectProjectDates={respectProjectDates}
            privateLocked={privateLocked}
            privateConfigured={argusPrivateConfigured()}
            returnTo={returnTo}
            timeline={page.timeline}
            neighborhood={neighborhood}
            runbooks={projectRunbooks}
            libraryRunbooks={libraryRunbooks}
            progressRecords={progressRecords}
            durationDays={page.durationDays}
            dateRangeLabel={page.dateRangeLabel}
            peopleWithRoles={page.peopleWithRoles}
            linkedTopics={page.linkedTopics}
            linkedEventsCount={page.linkedEventsCount}
            tagPatterns={page.tagPatterns}
            keyMetrics={page.keyMetrics}
            org={page.org ? { id: page.org.id, name: page.org.name } : undefined}
            stats={page.stats}
          />
        </div>
      </div>
    </div>
  );
}
