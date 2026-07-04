import { redirect } from "next/navigation";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { deleteEntityAction } from "@/app/argus/actions";
import { EntityEvidenceSection } from "@/app/argus/components/EntityEvidenceSection";
import { EntityEditForm } from "@/app/argus/components/EntityEditForm";
import { ArgusDeleteForm } from "@/app/argus/components/ArgusDeleteForm";
import { Card, EmptyState, formatDate, PageHeader } from "@/app/argus/components/ui";
import { entityKindLabel, entityNotesForDisplay } from "@/lib/argus/reference-types";
import {
  RELATIONSHIP_HEALTH_COLORS,
  RELATIONSHIP_HEALTH_LABELS,
  STRATEGIC_VALUE_LABELS,
} from "@/lib/argus/labels";
import { loadEntityEvidence } from "@/lib/argus/entity-evidence";
import { buildEntityIntelligence } from "@/lib/argus/network-intelligence";
import { ENTITY_PAGE, TESTING } from "@/lib/argus/ux-copy";
import { getEntities, getEntity, readArgus } from "@/lib/argus/server-storage";

export default async function EntityNetworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const entity = await getEntity(id);

  if (!entity) {
    return (
      <>
        <PageHeader title="Not found" backHref="/argus/network" />
        <EmptyState message="Entity not found." />
      </>
    );
  }

  if (entity.type === "project") {
    redirect(`/argus/projects/${id}`);
  }

  const data = await readArgus();
  const entities = await getEntities();
  const today = new Date().toISOString().slice(0, 10);
  const intel = buildEntityIntelligence(data, entity, includePrivate, today);
  const evidence = await loadEntityEvidence(id, includePrivate);
  const sv = entity.strategicValue ?? 3;

  return (
    <>
      <PageHeader title={entity.name} backHref="/argus/network" />

      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-400">{entityKindLabel(entity)}</p>
            {entity.alias && <p className="mt-1 text-sm text-zinc-500">{entity.alias}</p>}
          </div>
          <span className={`text-sm font-medium ${RELATIONSHIP_HEALTH_COLORS[intel.relationshipHealth]}`}>
            {RELATIONSHIP_HEALTH_LABELS[intel.relationshipHealth]}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-800 pt-4 text-sm">
          <div>
            <dt className="text-xs text-zinc-600">Strategic value</dt>
            <dd className="text-zinc-200">{sv}/5 — {STRATEGIC_VALUE_LABELS[sv]}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Outcome score</dt>
            <dd className="text-zinc-200">{intel.outcomeScore}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Attention score</dt>
            <dd className="text-teal-400">{intel.attentionScore}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Last interaction</dt>
            <dd className="text-zinc-200">
              {intel.lastMeaningfulInteraction ? formatDate(intel.lastMeaningfulInteraction) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Next follow-up</dt>
            <dd className="text-zinc-200">
              {intel.nextFollowUp ? formatDate(intel.nextFollowUp) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Open follow-ups</dt>
            <dd className="text-zinc-200">{intel.openFollowUps}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">{ENTITY_PAGE.linkedDocuments}</dt>
            <dd className="text-zinc-200">{intel.evidenceCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">{ENTITY_PAGE.notes}</dt>
            <dd className="text-zinc-200">{intel.logCount}</dd>
          </div>
        </dl>

        {intel.topics.length > 0 && (
          <p className="mt-4 border-t border-zinc-800 pt-3 text-xs text-teal-500">
            Topics: {intel.topics.join(" · ")}
          </p>
        )}

        {entityNotesForDisplay(entity.notes) && (
          <p className="mt-3 border-t border-zinc-800 pt-3 text-sm text-zinc-400">
            {entityNotesForDisplay(entity.notes)}
          </p>
        )}
      </Card>

      <EntityEditForm entity={entity} />

      <ArgusDeleteForm
        action={deleteEntityAction}
        confirmMessage={TESTING.deleteEntityConfirm}
        label={TESTING.deleteEntity}
        className="mb-6"
      >
        <input type="hidden" name="entityId" value={entity.id} />
      </ArgusDeleteForm>

      <EntityEvidenceSection
        logs={evidence.logs}
        linkedInbox={evidence.linkedInbox}
        entities={entities}
        entityName={entity.name}
      />
    </>
  );
}
