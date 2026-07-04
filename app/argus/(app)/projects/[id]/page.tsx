import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { deleteEntityAction } from "@/app/argus/actions";
import { EntityEvidenceSection } from "@/app/argus/components/EntityEvidenceSection";
import { ArgusDeleteForm } from "@/app/argus/components/ArgusDeleteForm";
import { ProjectEditForm } from "@/app/argus/components/ProjectEditForm";
import { EmptyState, formatDate, PageHeader } from "@/app/argus/components/ui";
import { buildEntityPickerBuckets, buildTagBuckets } from "@/lib/argus/journal-helpers";
import { loadEnrichedProjectEvidence } from "@/lib/argus/project-evidence";
import { ENTITY_PAGE, KIND_GUIDE, TESTING } from "@/lib/argus/ux-copy";
import { getEntities, getEntity, readArgus } from "@/lib/argus/server-storage";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const entity = await getEntity(id);

  if (!entity || entity.type !== "project") {
    return (
      <>
        <PageHeader title="Not found" backHref="/argus/journal" />
        <EmptyState message="Project not found." />
      </>
    );
  }

  const data = await readArgus();
  const entities = await getEntities();
  const evidence = await loadEnrichedProjectEvidence(entity, includePrivate);
  const allBuckets = buildEntityPickerBuckets(data, includePrivate);
  const tagBuckets = buildTagBuckets(data, includePrivate);

  return (
    <>
      <PageHeader title={entity.name} backHref="/argus/journal" />

      <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
        <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">{KIND_GUIDE.project}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-800 pt-4">
          <div>
            <dt className="text-xs text-zinc-600">Start</dt>
            <dd className="text-zinc-200">{entity.startDate ? formatDate(entity.startDate) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">End</dt>
            <dd className="text-zinc-200">{entity.endDate ? formatDate(entity.endDate) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Linked emails</dt>
            <dd className="text-zinc-200">{evidence.emailCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Journal records</dt>
            <dd className="text-zinc-200">{evidence.logCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">People</dt>
            <dd className="text-zinc-200">{entity.linkedPersonIds?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Topics</dt>
            <dd className="text-zinc-200">{entity.linkedTopicIds?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Events</dt>
            <dd className="text-zinc-200">{entity.linkedEventIds?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Tags</dt>
            <dd className="text-zinc-200">{entity.linkedTags?.length ?? 0}</dd>
          </div>
        </dl>
      </div>

      <ProjectEditForm entity={entity} allBuckets={allBuckets} tagBuckets={tagBuckets} />

      <ArgusDeleteForm
        action={deleteEntityAction}
        confirmMessage={TESTING.deleteEntityConfirm}
        label={TESTING.deleteEntity}
        className="mb-6"
      >
        <input type="hidden" name="entityId" value={entity.id} />
      </ArgusDeleteForm>

      <EntityEvidenceSection
        logs={evidence.directLogs}
        enrichedInbox={evidence.enrichedInbox}
        viaContactEnrichedInbox={evidence.viaContactEnrichedInbox}
        viaContactLogs={evidence.viaContactLogs}
        entities={entities}
        entityName={entity.name}
        emailCount={evidence.emailCount}
        logCount={evidence.logCount}
        scopeHint={ENTITY_PAGE.projectScopeHint}
      />
    </>
  );
}
