"use client";

import { ArgusLinkModal, type ArgusLinkFilter, type ArgusLinkResult } from "@/app/argus/components/ArgusLinkModal";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import type { CreatedEntityResult } from "@/app/argus/actions";

/** Inbox-specific wrapper — same UI as global Argus link menu. */
export function V2InboxEntityLinkModal({
  open,
  buckets,
  tagBuckets,
  selectedIds,
  selectedTags,
  initialFilter = "all",
  onConfirm,
  onClose,
  onEntityCreated,
}: {
  open: boolean;
  buckets: EntityPickerBuckets;
  tagBuckets?: TagBuckets;
  selectedIds: string[];
  selectedTags?: string[];
  initialFilter?: ArgusLinkFilter;
  onConfirm: (result: ArgusLinkResult) => void | Promise<void>;
  onClose: () => void;
  onEntityCreated?: (entity: CreatedEntityResult) => void | Promise<void | false>;
}) {
  return (
    <ArgusLinkModal
      open={open}
      buckets={buckets}
      tagBuckets={tagBuckets}
      title="Link email"
      selectedEntityIds={selectedIds}
      selectedTags={selectedTags}
      initialFilter={initialFilter}
      showTags
      onConfirm={onConfirm}
      onClose={onClose}
      onEntityCreated={onEntityCreated}
    />
  );
}
