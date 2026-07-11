import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { CreatedEntityResult } from "@/app/argus/actions";
import type { CreateFlowOpenOptions, LinkPanelFilter, LinkPanelResult } from "@/lib/argus/create-flow-types";

export type LinkModalOpenOptions = {
  title?: string;
  subtitle?: string;
  entityId?: string;
  linkedEntityIds?: string[];
  selectedTags?: string[];
  showTags?: boolean;
  buckets?: EntityPickerBuckets;
  initialFilter?: LinkPanelFilter;
  onConfirm?: (result: LinkPanelResult) => void | Promise<void>;
  onEntityCreated?: (entity: CreatedEntityResult) => void | Promise<void | false>;
};

/** True when the unified flow should render ArgusLinkModal instead of the full create workspace. */
export function usesLinkModalShell(options: CreateFlowOpenOptions): boolean {
  if (options.mode === "link") return true;
  if (options.mode === "inbox-evidence" && options.linkOnly) return true;
  if (options.linkPanelOnly) return true;
  return false;
}

export function mapLinkModalToCreateFlow(options: LinkModalOpenOptions): CreateFlowOpenOptions {
  const hasCustomConfirm = Boolean(options.onConfirm);
  return {
    mode: "link",
    entityId: options.entityId,
    linkedEntityIds: options.linkedEntityIds,
    prefillTags: options.selectedTags,
    linkTitle: options.title,
    linkSubtitle: options.subtitle,
    showTags: options.showTags,
    initialLinkFilter: options.initialFilter,
    linkBuckets: options.buckets,
    linkPanelOnly: hasCustomConfirm || !options.entityId,
    onLinkConfirm: options.onConfirm,
    onEntityCreated: options.onEntityCreated,
  };
}
