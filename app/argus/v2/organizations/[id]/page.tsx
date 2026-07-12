import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { entityNotesForDisplay } from "@/lib/argus/reference-types";
import { getEntity, getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { entityHasPrivateEvidence } from "@/lib/argus/entity-private-evidence";
import { loadOrganizationPageData } from "@/lib/argus/v2/loaders";
import { buildV2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import { buildV2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { resolveEntityLifecycleStatus } from "@/lib/argus/entity-lifecycle";
import { V2QuickDeliverButton } from "../../components/V2QuickDeliverModal";
import { V2EntityLifecycleActions } from "../../components/V2EntityLifecycleActions";
import { V2TagPatternBadges } from "../../components/V2TagPatternBadges";
import { V2RecordRecentEntity } from "../../components/V2RecordRecentEntity";
import { V2Badge, V2BackLink } from "../../components/v2-ui";
import { V2EntityCreateButton, V2EntityLinkButton } from "../../components/V2CreateEntityButton";
import { V2OrgShell } from "../../components/V2OrgShell";
import { EmptyState } from "@/app/argus/components/ui";

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

export default async function V2OrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    delete_error?: string;
    delete_auth_error?: string;
    totp_required?: string;
    error?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
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
  const lifecycleStatus = resolveEntityLifecycleStatus(entity, today);
  const hasPrivateEvidence = entityHasPrivateEvidence(data, inboxItems, entity.id);
  const deleteGate = await buildV2DeleteGateProps(entity, sp);
  const privateLocked = hasPrivateEvidence && !includePrivate;
  const returnTo = `/argus/v2/organizations/${entity.id}`;
  const linkedTopics = page.tagPatterns.map((pattern) => pattern.tag);

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
                  <V2EntityCreateButton className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800" />
                  <V2QuickDeliverButton
                    scopeType="organization"
                    scopeId={entity.id}
                    scopeName={entity.name}
                    label="PDF"
                    className="rounded-lg border border-emerald-500/40 bg-emerald-600/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/25"
                  />
                  <Link
                    href={`/argus/v2/deliver?scopeType=organization&scopeId=${entity.id}&package=pdf_deliver`}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                  >
                    Deliver
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
                  returnTo={returnTo}
                  hasPrivateEvidence={hasPrivateEvidence}
                  privateConfigured={argusPrivateConfigured()}
                  privateUnlocked={includePrivate}
                  showDelete
                  variant="inline"
                  {...deleteGate}
                />
              </div>
            </div>
          </header>

          <V2OrgShell
            entity={entity}
            privateLocked={privateLocked}
            privateConfigured={argusPrivateConfigured()}
            returnTo={returnTo}
            timeline={page.timeline}
            neighborhood={neighborhood}
            linkedPeople={page.linkedPeople}
            orgProjects={page.orgProjects}
            recentProjects={page.recentProjects}
            tagPatterns={page.tagPatterns}
            stats={page.stats}
            relationshipScore={page.relationshipScore}
            relationshipLabel={page.relationshipLabel}
            sparkline={page.sparkline}
            chartStartYear={page.chartStartYear}
            chartEndYear={page.chartEndYear}
            relationshipMetrics={page.relationshipMetrics}
            linkedTopics={linkedTopics}
          />
        </div>
      </div>
    </div>
  );
}
