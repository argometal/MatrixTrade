"use client";

import { useMemo, useState } from "react";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import type { Entity } from "@/lib/argus/types";
import { updateEntityAction } from "@/app/argus/actions";
import { entityNotesForDisplay, referenceKindFromNotes } from "@/lib/argus/reference-types";
import {
  filterEntityPickerBuckets,
  linkSourceKindFromEntity,
} from "@/lib/argus/link-hierarchy";
import { ACTIVITY_EDIT, LINK_HIERARCHY } from "@/lib/argus/ux-copy";
import { NetworkRelationshipMetricsFields } from "./NetworkRelationshipMetricsFields";
import { EntityChip } from "./Cards";
import type { EntityPickerBuckets } from "./ReferencePickerModal";
import { inputClass } from "./ui";

function idsMatchingKind(entities: Entity[], ids: string[], kind: "person" | "event"): string[] {
  const entityMap = new Map(entities.map((entity) => [entity.id, entity]));
  return ids.filter((id) => {
    const entity = entityMap.get(id);
    if (!entity) return false;
    if (kind === "person") return entity.type === "person" || entity.type === "company";
    return referenceKindFromNotes(entity.notes ?? "") === "event";
  });
}

function structuralSeedIds(center: Entity, all: Entity[]): string[] {
  const outbound = [
    ...new Set([
      ...(center.linkedEntityIds ?? []),
      ...(center.linkedPersonIds ?? []),
      ...(center.linkedTopicIds ?? []),
      ...(center.linkedEventIds ?? []),
    ]),
  ];
  const reverse = all
    .filter((other) => {
      if (other.id === center.id || other.deletedAt) return false;
      return [
        ...(other.linkedEntityIds ?? []),
        ...(other.linkedPersonIds ?? []),
        ...(other.linkedTopicIds ?? []),
        ...(other.linkedEventIds ?? []),
      ].includes(center.id);
    })
    .map((other) => other.id);
  return [...new Set([...outbound, ...reverse])];
}

function EntityLinkGroup({
  label,
  hint,
  linkedEntities,
  buckets,
  selectedIds,
  onChange,
  allowedKinds,
  defaultKind,
  createLabel,
}: {
  label: string;
  hint?: string;
  linkedEntities: Entity[];
  buckets: EntityPickerBuckets;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allowedKinds: Array<"person" | "event" | "topic">;
  defaultKind: "person" | "event" | "topic";
  createLabel: string;
}) {
  const { openLinkModal } = useArgusAdd();

  function openPicker() {
    openLinkModal({
      title: createLabel.replace(/^\+ /, "Link "),
      linkedEntityIds: selectedIds,
      buckets,
      initialFilter: defaultKind,
      showTags: false,
      onConfirm: (result) => onChange(result.entityIds),
    });
  }

  return (
    <div>
      <span className="text-xs text-zinc-500">{label}</span>
      {hint ? <p className="mt-1 text-[11px] text-zinc-600">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openPicker}
          className="rounded-full border border-zinc-700 px-3 py-1.5 text-[13px] text-zinc-300 hover:bg-zinc-800"
        >
          {ACTIVITY_EDIT.linkTo}
        </button>
      </div>
      {linkedEntities.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {linkedEntities.map((entity) => (
            <EntityChip key={entity.id} entity={entity} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EntityEditForm({
  entity,
  allBuckets,
}: {
  entity: Entity;
  allBuckets: EntityPickerBuckets;
}) {
  const sourceKind = linkSourceKindFromEntity(entity);
  const notesKind = referenceKindFromNotes(entity.notes ?? "");
  const allEntities = allBuckets.alphabetical;
  const entityMap = useMemo(() => new Map(allEntities.map((entry) => [entry.id, entry])), [allEntities]);

  const seedIds = structuralSeedIds(entity, allEntities);
  const initialPersonIds = idsMatchingKind(allEntities, seedIds, "person");
  const initialEventIds = idsMatchingKind(allEntities, seedIds, "event");
  const initialTopicIds = seedIds.filter((id) => {
    const entry = entityMap.get(id);
    return entry && referenceKindFromNotes(entry.notes ?? "") === "topic";
  });
  /** Preserve org/project links the form does not edit (avoid wipe on save). */
  const preservedStructuralIds = seedIds.filter((id) => {
    const entry = entityMap.get(id);
    if (!entry) return false;
    if (entry.type === "project") return true;
    if (entry.type === "company") return sourceKind === "topic" || sourceKind === "event";
    return false;
  });

  const [linkedPersonIds, setLinkedPersonIds] = useState(initialPersonIds);
  const [linkedEventIds, setLinkedEventIds] = useState(initialEventIds);
  const [linkedTopicIds, setLinkedTopicIds] = useState(initialTopicIds);
  const [eventDate, setEventDate] = useState(entity.startDate ?? "");
  const [eventEndDate, setEventEndDate] = useState(entity.endDate ?? "");

  const peopleOnlyBuckets = useMemo(() => {
    const filtered = filterEntityPickerBuckets(allBuckets, sourceKind);
    const keepPerson = (entry: Entity) => entry.type === "person" || entry.type === "company";
    return {
      recent: filtered.recent.filter(keepPerson),
      frequent: filtered.frequent.filter(keepPerson),
      alphabetical: filtered.alphabetical.filter(keepPerson),
    };
  }, [allBuckets, sourceKind]);

  const eventBuckets = useMemo(() => {
    const filtered = filterEntityPickerBuckets(allBuckets, "topic");
    const keepEvent = (entry: Entity) => referenceKindFromNotes(entry.notes ?? "") === "event";
    return {
      recent: filtered.recent.filter(keepEvent),
      frequent: filtered.frequent.filter(keepEvent),
      alphabetical: filtered.alphabetical.filter(keepEvent),
    };
  }, [allBuckets]);

  const topicBuckets = useMemo(() => {
    const filtered = filterEntityPickerBuckets(allBuckets, "event");
    const keepTopic = (entry: Entity) => referenceKindFromNotes(entry.notes ?? "") === "topic";
    return {
      recent: filtered.recent.filter(keepTopic),
      frequent: filtered.frequent.filter(keepTopic),
      alphabetical: filtered.alphabetical.filter(keepTopic),
    };
  }, [allBuckets]);

  const linkedPeople = linkedPersonIds
    .map((id) => entityMap.get(id))
    .filter((entry): entry is Entity => Boolean(entry));
  const linkedEvents = linkedEventIds
    .map((id) => entityMap.get(id))
    .filter((entry): entry is Entity => Boolean(entry));
  const linkedTopics = linkedTopicIds
    .map((id) => entityMap.get(id))
    .filter((entry): entry is Entity => Boolean(entry));

  const mergedLinkedIds = [
    ...new Set([...linkedPersonIds, ...linkedEventIds, ...linkedTopicIds, ...preservedStructuralIds]),
  ];
  const showPersonLinks = true;
  const showEventLinks = sourceKind === "topic";
  const showTopicLinks = sourceKind === "event";

  return (
    <form action={updateEntityAction} className="mb-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <input type="hidden" name="entityId" value={entity.id} />
      {mergedLinkedIds.map((id) => (
        <input key={id} type="hidden" name="linkedEntityIds" value={id} />
      ))}

      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Editable fields</p>

      <label className="block">
        <span className="text-xs text-zinc-500">Name</span>
        <input
          name="name"
          required
          defaultValue={entity.name}
          placeholder="Display name"
          className={`${inputClass} mt-1`}
        />
      </label>

      <NetworkRelationshipMetricsFields entity={entity} />

      <label className="block">
        <span className="text-xs text-zinc-500">Alias</span>
        <input
          name="alias"
          defaultValue={entity.alias ?? ""}
          placeholder="Optional short label"
          className={`${inputClass} mt-1`}
        />
      </label>

      {notesKind === "event" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-zinc-500">{LINK_HIERARCHY.eventDate}</span>
            <input
              type="date"
              name="startDate"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500">{LINK_HIERARCHY.eventEndDate}</span>
            <input
              type="date"
              name="endDate"
              value={eventEndDate}
              onChange={(event) => setEventEndDate(event.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>
      ) : null}

      {notesKind === "event" ? (
        <p className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
          Event narrative lives on <span className="text-zinc-400">Event → Note</span> (Chronicle).
          Entity notes stay a Kind shell only — do not edit the Record blob here.
        </p>
      ) : (
        <label className="block">
          <span className="text-xs text-zinc-500">Notes</span>
          <textarea
            name="notes"
            defaultValue={entityNotesForDisplay(entity.notes)}
            rows={3}
            className={`${inputClass} mt-1 resize-none`}
          />
        </label>
      )}

      {showPersonLinks ? (
        <EntityLinkGroup
          label={LINK_HIERARCHY.linkedPeople}
          linkedEntities={linkedPeople}
          buckets={peopleOnlyBuckets}
          selectedIds={linkedPersonIds}
          onChange={setLinkedPersonIds}
          allowedKinds={["person"]}
          defaultKind="person"
          createLabel={LINK_HIERARCHY.newPerson}
        />
      ) : null}

      {showEventLinks ? (
        <EntityLinkGroup
          label={LINK_HIERARCHY.linkedEvents}
          hint={LINK_HIERARCHY.topicEventsHint}
          linkedEntities={linkedEvents}
          buckets={eventBuckets}
          selectedIds={linkedEventIds}
          onChange={setLinkedEventIds}
          allowedKinds={["event"]}
          defaultKind="event"
          createLabel={LINK_HIERARCHY.newEvent}
        />
      ) : null}

      {showTopicLinks ? (
        <EntityLinkGroup
          label="Linked Topics"
          hint="Topics related to this event — mirrored both ways so the Topic Links list stays in sync."
          linkedEntities={linkedTopics}
          buckets={topicBuckets}
          selectedIds={linkedTopicIds}
          onChange={setLinkedTopicIds}
          allowedKinds={["topic"]}
          defaultKind="topic"
          createLabel="+ Topic"
        />
      ) : null}

      <button type="submit" className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600">
        Save
      </button>
    </form>
  );
}
