"use client";

import { useMemo, useState } from "react";
import type { Entity } from "@/lib/argus/types";
import { updateEntityAction } from "@/app/argus/actions";
import { entityNotesForDisplay, referenceKindFromNotes } from "@/lib/argus/reference-types";
import {
  filterEntityPickerBuckets,
  linkSourceKindFromEntity,
} from "@/lib/argus/link-hierarchy";
import { STRATEGIC_VALUE_LABELS } from "@/lib/argus/labels";
import type { StrategicValue } from "@/lib/argus/types";
import { ACTIVITY_EDIT, LINK_HIERARCHY } from "@/lib/argus/ux-copy";
import { EntityChip } from "./Cards";
import { ReferencePickerModal, type EntityPickerBuckets } from "./ReferencePickerModal";
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
  allowedKinds: Array<"person" | "event">;
  defaultKind: "person" | "event";
  createLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <span className="text-xs text-zinc-500">{label}</span>
      {hint ? <p className="mt-1 text-[11px] text-zinc-600">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
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

      <ReferencePickerModal
        open={open}
        buckets={buckets}
        selectedIds={selectedIds}
        onChange={onChange}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        defaultCreateKind={defaultKind}
        allowedCreateKinds={allowedKinds}
        createButtonLabel={createLabel}
      />
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
  const sv = entity.strategicValue ?? 3;
  const sourceKind = linkSourceKindFromEntity(entity);
  const notesKind = referenceKindFromNotes(entity.notes ?? "");
  const allEntities = allBuckets.alphabetical;
  const entityMap = useMemo(() => new Map(allEntities.map((entry) => [entry.id, entry])), [allEntities]);

  const initialPersonIds = idsMatchingKind(allEntities, entity.linkedEntityIds ?? [], "person");
  const initialEventIds = idsMatchingKind(allEntities, entity.linkedEntityIds ?? [], "event");

  const [linkedPersonIds, setLinkedPersonIds] = useState(initialPersonIds);
  const [linkedEventIds, setLinkedEventIds] = useState(initialEventIds);
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

  const linkedPeople = linkedPersonIds
    .map((id) => entityMap.get(id))
    .filter((entry): entry is Entity => Boolean(entry));
  const linkedEvents = linkedEventIds
    .map((id) => entityMap.get(id))
    .filter((entry): entry is Entity => Boolean(entry));

  const mergedLinkedIds = [...new Set([...linkedPersonIds, ...linkedEventIds])];
  const showPersonLinks = true;
  const showEventLinks = sourceKind === "topic";

  return (
    <form action={updateEntityAction} className="mb-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <input type="hidden" name="entityId" value={entity.id} />
      {mergedLinkedIds.map((id) => (
        <input key={id} type="hidden" name="linkedEntityIds" value={id} />
      ))}

      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Editable fields</p>

      <label className="block">
        <span className="text-xs text-zinc-500">Strategic value</span>
        <select name="strategicValue" defaultValue={sv} className={`${inputClass} mt-1`}>
          {([1, 2, 3, 4, 5] as StrategicValue[]).map((value) => (
            <option key={value} value={value}>
              {value} — {STRATEGIC_VALUE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

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

      <label className="block">
        <span className="text-xs text-zinc-500">Notes</span>
        <textarea
          name="notes"
          defaultValue={entityNotesForDisplay(entity.notes)}
          rows={3}
          className={`${inputClass} mt-1 resize-none`}
        />
      </label>

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

      <button type="submit" className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600">
        Save
      </button>
    </form>
  );
}
