"use client";

import { useRouter } from "next/navigation";
import {
  saveInboxLinksAction,
  setEntityLinkedIdsAction,
  updateInboxTriageAction,
} from "@/app/argus/actions";
import { ArgusLinkModal } from "@/app/argus/components/ArgusLinkModal";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import type { CreateFlowOpenOptions, LinkPanelResult } from "@/lib/argus/create-flow-types";
import { filterEntityPickerBuckets } from "@/lib/argus/link-hierarchy";
import { LINK_HIERARCHY } from "@/lib/argus/ux-copy";

/** Link picker rendered from the unified create flow (same UI as legacy ArgusLinkModal). */
export function ArgusUnifiedLinkPanel({
  open,
  onClose,
  options,
  buckets,
  tagBuckets,
}: {
  open: boolean;
  onClose: () => void;
  options: CreateFlowOpenOptions;
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
}) {
  const router = useRouter();
  const linkBuckets =
    options.linkBuckets ?? (options.inboxId ? filterEntityPickerBuckets(buckets, "inbox") : buckets);

  async function handleConfirm(result: LinkPanelResult) {
    if (options.onLinkConfirm) {
      await options.onLinkConfirm(result);
    } else if (options.mode === "link" && options.entityId) {
      await setEntityLinkedIdsAction(options.entityId, result.entityIds);
      router.refresh();
    } else if (options.mode === "inbox-evidence" && options.inboxId) {
      await saveInboxLinksAction(options.inboxId, result.entityIds);
      await updateInboxTriageAction(options.inboxId, { topics: result.tags });
      router.refresh();
      if (options.returnTo) {
        router.push(options.returnTo);
      }
    }
    onClose();
  }

  const title =
    options.linkTitle ??
    (options.mode === "inbox-evidence" ? "Link email" : options.mode === "link" ? "Link" : "Link");
  const subtitle = options.linkSubtitle ?? LINK_HIERARCHY.inboxLinkHint;

  return (
    <ArgusLinkModal
      open={open}
      buckets={linkBuckets}
      tagBuckets={tagBuckets}
      title={title}
      subtitle={subtitle}
      selectedEntityIds={options.linkedEntityIds ?? []}
      selectedTags={options.prefillTags ?? []}
      showTags={options.showTags ?? true}
      excludeEntityIds={options.entityId ? [options.entityId] : []}
      initialFilter={options.initialLinkFilter ?? "all"}
      onConfirm={handleConfirm}
      onClose={onClose}
      onEntityCreated={options.onEntityCreated}
    />
  );
}
