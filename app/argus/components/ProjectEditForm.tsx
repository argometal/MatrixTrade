"use client";

import { useMemo, useState } from "react";
import type { Entity } from "@/lib/argus/types";
import { updateProjectAction } from "@/app/argus/actions";
import { ACTIVITY_EDIT, TAGS } from "@/lib/argus/ux-copy";
import { ReferencePickerModal, type EntityPickerBuckets } from "./ReferencePickerModal";
import { TagPickerModal, type TagBuckets } from "./TagPickerModal";
import { EntityChip } from "./Cards";
import { inputClass } from "./ui";

export function ProjectEditForm({
  entity,
  peopleBuckets,
  tagBuckets,
}: {
  entity: Entity;
  peopleBuckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
}) {
  const [name, setName] = useState(entity.name);
  const [startDate, setStartDate] = useState(entity.startDate ?? "");
  const [endDate, setEndDate] = useState(entity.endDate ?? "");
  const [linkedPersonIds, setLinkedPersonIds] = useState<string[]>(entity.linkedPersonIds ?? []);
  const [linkedTags, setLinkedTags] = useState<string[]>(entity.linkedTags ?? []);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  const entityMap = useMemo(
    () => new Map(peopleBuckets.alphabetical.map((e) => [e.id, e])),
    [peopleBuckets.alphabetical]
  );

  const linkedPeople = linkedPersonIds
    .map((id) => entityMap.get(id))
    .filter((e): e is Entity => Boolean(e));

  const canSave = name.trim().length > 0;

  return (
    <form action={updateProjectAction} className="mb-6 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <input type="hidden" name="entityId" value={entity.id} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="endDate" value={endDate} />
      <input type="hidden" name="linkedTags" value={linkedTags.join(", ")} />
      {linkedPersonIds.map((id) => (
        <input key={id} type="hidden" name="linkedPersonIds" value={id} />
      ))}

      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Editable fields</p>

      <label className="block">
        <span className="text-xs text-zinc-500">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputClass} mt-1`}
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-zinc-500">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-500">End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
      </div>

      <div>
        <span className="text-xs text-zinc-500">Linked people</span>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPeopleOpen(true)}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-[13px] text-zinc-300 hover:bg-zinc-800"
          >
            {ACTIVITY_EDIT.linkTo}
          </button>
        </div>
        {linkedPeople.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {linkedPeople.map((person) => (
              <EntityChip key={person.id} entity={person} />
            ))}
          </div>
        )}
      </div>

      <div>
        <span className="text-xs text-zinc-500">Linked tags</span>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTagsOpen(true)}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-[13px] text-zinc-300 hover:bg-zinc-800"
          >
            {ACTIVITY_EDIT.tags}
          </button>
        </div>
        {linkedTags.length > 0 && (
          <p className="mt-2 text-sm text-teal-400">
            {TAGS.selected(linkedTags.length, linkedTags.map((t) => `#${t}`).join(", "))}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSave}
        className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-40"
      >
        Save
      </button>

      <ReferencePickerModal
        open={peopleOpen}
        buckets={peopleBuckets}
        selectedIds={linkedPersonIds}
        onChange={setLinkedPersonIds}
        onClose={() => setPeopleOpen(false)}
        onConfirm={() => setPeopleOpen(false)}
        onPendingNew={() => {}}
      />

      <TagPickerModal
        open={tagsOpen}
        buckets={tagBuckets}
        selectedTags={linkedTags}
        onChange={setLinkedTags}
        onClose={() => setTagsOpen(false)}
      />
    </form>
  );
}
