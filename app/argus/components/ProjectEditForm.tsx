"use client";

import { useMemo, useState } from "react";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import type { Entity } from "@/lib/argus/types";
import { updateProjectAction } from "@/app/argus/actions";
import { ACTIVITY_EDIT, LINK_HIERARCHY, TAGS } from "@/lib/argus/ux-copy";
import {
  filterEntityPickerBuckets,
  type LinkContext,
} from "@/lib/argus/link-hierarchy";
import { referenceKindFromNotes } from "@/lib/argus/reference-types";
import type { EntityPickerBuckets } from "./ReferencePickerModal";
import type { TagBuckets } from "./TagPickerModal";
import { EntityChip } from "./Cards";
import { inputClass } from "./ui";

function bucketsForKind(buckets: EntityPickerBuckets, kind: "person" | "topic" | "event"): EntityPickerBuckets {
  const match = (entity: Entity) => {
    if (kind === "person") return entity.type === "person" || entity.type === "company";
    if (kind === "topic") return referenceKindFromNotes(entity.notes ?? "") === "topic";
    return referenceKindFromNotes(entity.notes ?? "") === "event";
  };
  return {
    recent: buckets.recent.filter(match),
    frequent: buckets.frequent.filter(match),
    alphabetical: buckets.alphabetical.filter(match),
  };
}

export function ProjectEditForm({
  entity,
  allBuckets,
  tagBuckets,
}: {
  entity: Entity;
  allBuckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
}) {
  const [name, setName] = useState(entity.name);
  const [startDate, setStartDate] = useState(entity.startDate ?? "");
  const [endDate, setEndDate] = useState(entity.endDate ?? "");
  const [linkedPersonIds, setLinkedPersonIds] = useState<string[]>(entity.linkedPersonIds ?? []);
  const [linkedTopicIds, setLinkedTopicIds] = useState<string[]>(entity.linkedTopicIds ?? []);
  const [linkedEventIds, setLinkedEventIds] = useState<string[]>(entity.linkedEventIds ?? []);
  const [linkedTags, setLinkedTags] = useState<string[]>(entity.linkedTags ?? []);
  const { openLinkModal } = useArgusAdd();

  const linkContext: LinkContext = useMemo(
    () => ({ projectStart: startDate || undefined, projectEnd: endDate || undefined }),
    [startDate, endDate]
  );

  const projectBuckets = useMemo(
    () => filterEntityPickerBuckets(allBuckets, "project", linkContext),
    [allBuckets, linkContext]
  );

  const peopleBuckets = useMemo(() => bucketsForKind(projectBuckets, "person"), [projectBuckets]);
  const topicBuckets = useMemo(() => bucketsForKind(projectBuckets, "topic"), [projectBuckets]);
  const eventBuckets = useMemo(() => bucketsForKind(projectBuckets, "event"), [projectBuckets]);

  const entityMap = useMemo(
    () => new Map(allBuckets.alphabetical.map((entry) => [entry.id, entry])),
    [allBuckets.alphabetical]
  );

  const linkedPeople = linkedPersonIds
    .map((id) => entityMap.get(id))
    .filter((entry): entry is Entity => Boolean(entry));
  const linkedTopics = linkedTopicIds
    .map((id) => entityMap.get(id))
    .filter((entry): entry is Entity => Boolean(entry));
  const linkedEvents = linkedEventIds
    .map((id) => entityMap.get(id))
    .filter((entry): entry is Entity => Boolean(entry));

  const canSave = name.trim().length > 0;

  function openPeopleLink() {
    openLinkModal({
      title: LINK_HIERARCHY.linkedPeople,
      linkedEntityIds: linkedPersonIds,
      buckets: peopleBuckets,
      initialFilter: "person",
      showTags: false,
      onConfirm: (result) => setLinkedPersonIds(result.entityIds),
    });
  }

  function openTopicsLink() {
    openLinkModal({
      title: LINK_HIERARCHY.linkedTopics,
      linkedEntityIds: linkedTopicIds,
      buckets: topicBuckets,
      initialFilter: "topic",
      showTags: false,
      onConfirm: (result) => setLinkedTopicIds(result.entityIds),
    });
  }

  function openEventsLink() {
    openLinkModal({
      title: LINK_HIERARCHY.linkedEvents,
      linkedEntityIds: linkedEventIds,
      buckets: eventBuckets,
      initialFilter: "event",
      showTags: false,
      onConfirm: (result) => setLinkedEventIds(result.entityIds),
    });
  }

  function openTagsLink() {
    openLinkModal({
      title: "Linked tags",
      linkedEntityIds: [],
      selectedTags: linkedTags,
      initialFilter: "tags",
      showTags: true,
      onConfirm: (result) => setLinkedTags(result.tags),
    });
  }

  return (
    <form action={updateProjectAction} className="mb-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <input type="hidden" name="entityId" value={entity.id} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="endDate" value={endDate} />
      <input type="hidden" name="linkedTags" value={linkedTags.join(", ")} />
      {linkedPersonIds.map((id) => (
        <input key={`person-${id}`} type="hidden" name="linkedPersonIds" value={id} />
      ))}
      {linkedTopicIds.map((id) => (
        <input key={`topic-${id}`} type="hidden" name="linkedTopicIds" value={id} />
      ))}
      {linkedEventIds.map((id) => (
        <input key={`event-${id}`} type="hidden" name="linkedEventIds" value={id} />
      ))}

      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Editable fields</p>

      <label className="block">
        <span className="text-xs text-zinc-500">Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass} mt-1`} required />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-zinc-500">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
      </div>

      <div>
        <span className="text-xs text-zinc-500">{LINK_HIERARCHY.linkedPeople}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPeopleLink}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-[13px] text-zinc-300 hover:bg-zinc-800"
          >
            {ACTIVITY_EDIT.linkTo}
          </button>
        </div>
        {linkedPeople.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {linkedPeople.map((person) => (
              <EntityChip key={person.id} entity={person} />
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <span className="text-xs text-zinc-500">{LINK_HIERARCHY.linkedTopics}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openTopicsLink}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-[13px] text-zinc-300 hover:bg-zinc-800"
          >
            {ACTIVITY_EDIT.linkTo}
          </button>
        </div>
        {linkedTopics.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {linkedTopics.map((topic) => (
              <EntityChip key={topic.id} entity={topic} />
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <span className="text-xs text-zinc-500">{LINK_HIERARCHY.linkedEvents}</span>
        <p className="mt-1 text-[11px] text-zinc-600">{LINK_HIERARCHY.projectEventsHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openEventsLink}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-[13px] text-zinc-300 hover:bg-zinc-800"
          >
            {ACTIVITY_EDIT.linkTo}
          </button>
        </div>
        {linkedEvents.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {linkedEvents.map((eventEntity) => (
              <EntityChip key={eventEntity.id} entity={eventEntity} />
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <span className="text-xs text-zinc-500">Linked tags</span>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openTagsLink}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-[13px] text-zinc-300 hover:bg-zinc-800"
          >
            {ACTIVITY_EDIT.tags}
          </button>
        </div>
        {linkedTags.length > 0 ? (
          <p className="mt-2 text-sm text-teal-400">
            {TAGS.selected(linkedTags.length, linkedTags.map((tag) => `#${tag}`).join(", "))}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={!canSave}
        className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-40"
      >
        Save
      </button>
    </form>
  );
}
