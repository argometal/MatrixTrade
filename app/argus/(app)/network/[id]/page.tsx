import { redirect } from "next/navigation";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { deleteEntityAction } from "@/app/argus/actions";
import { EntityEvidenceSection } from "@/app/argus/components/EntityEvidenceSection";
import { EntityEditForm } from "@/app/argus/components/EntityEditForm";
import { ArgusDeleteForm } from "@/app/argus/components/ArgusDeleteForm";
import { Card, EmptyState, formatDate, PageHeader } from "@/app/argus/components/ui";
import { entityKindLabel, entityNotesForDisplay, referenceKindFromNotes } from "@/lib/argus/reference-types";
import {
  RELATIONSHIP_HEALTH_COLORS,
  RELATIONSHIP_HEALTH_LABELS,
  STRATEGIC_VALUE_LABELS,
} from "@/lib/argus/labels";
import { buildEntityPickerBuckets } from "@/lib/argus/journal-helpers";
import { loadEnrichedEntityEvidence } from "@/lib/argus/entity-evidence";
import { buildEntityIntelligence } from "@/lib/argus/network-intelligence";
import { ENTITY_PAGE, KIND_GUIDE, TESTING } from "@/lib/argus/ux-copy";
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
  const allBuckets = buildEntityPickerBuckets(data, includePrivate);
  const today = new Date().toISOString().slice(0, 10);
  const intel = buildEntityIntelligence(data, entity, includePrivate, today);
  const evidence = await loadEnrichedEntityEvidence(id, includePrivate);
  const sv = entity.strategicValue ?? 3;
  const isEvent = referenceKindFromNotes(entity.notes ?? "") === "event";
  const isOrganization = entity.type === "company";
  const hasEvidence = evidence.emailCount > 0 || evidence.logCount > 0;

  return (
    <>
      <PageHeader title={entity.name} backHref="/argus/network" />

      <Card className="mb-4">
        {isOrganization ? (
          <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">{KIND_GUIDE.organization}</p>
        ) : null}
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
          {referenceKindFromNotes(entity.notes ?? "") === "event" ? (
            <>
              <div>
                <dt className="text-xs text-zinc-600">Event date</dt>
                <dd className="text-zinc-200">{entity.startDate ? formatDate(entity.startDate) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-600">End date</dt>
                <dd className="text-zinc-200">{entity.endDate ? formatDate(entity.endDate) : "—"}</dd>
              </div>
            </>
          ) : null}
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
            <dt className="text-xs text-zinc-600">Linked emails</dt>
            <dd className="text-zinc-200">{evidence.emailCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-600">Journal records</dt>
            <dd className="text-zinc-200">{evidence.logCount}</dd>
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

      <EntityEditForm entity={entity} allBuckets={allBuckets} />

      <ArgusDeleteForm
        action={deleteEntityAction}
        confirmMessage={TESTING.deleteEntityConfirm}
        label={TESTING.deleteEntity}
        className="mb-6"
      >
        <input type="hidden" name="entityId" value={entity.id} />
      </ArgusDeleteForm>

      {isEvent && !hasEvidence ? (
        <p className="mb-4 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-200/90">
          {ENTITY_PAGE.eventEvidenceHint}
        </p>
      ) : null}

      <EntityEvidenceSection
        logs={evidence.logs}
        enrichedInbox={evidence.enrichedInbox}
        entities={entities}
        entityName={entity.name}
        emailCount={evidence.emailCount}
        logCount={evidence.logCount}
      />
    </>
  );
}
