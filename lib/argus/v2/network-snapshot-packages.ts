import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import { wrapSnapshotText } from "@/lib/snapshot-verification";
import { buildArgusNetworkBrief } from "../network-ai-brief";
import { buildNetworkAiSnapshot } from "../network-ai-snapshot";
import {
  buildNetworkBrowsePanelPackage,
  buildNetworkContactPanelPackage,
  type NetworkPanelPackage,
} from "../network-ai-mechanics";
import type {
  V2NetworkBrowseCard,
  V2NetworkBrowseInsight,
  V2NetworkBrowseSummary,
} from "./network-browse-utils";
import type { NetworkContactPageData } from "./network-contact-loaders";

export type { NetworkPanelPackage };

/** @deprecated Prefer Network Mechanics — retained for explicit Additional context / debugging. */
export function networkCharterSnapshotItem(): SnapshotMenuItem {
  return {
    id: "network-charter",
    label: "Network charter brief",
    description: "ARGUS rules, past vs future, human Apply gate",
    text: wrapSnapshotText("Network charter brief", buildArgusNetworkBrief()),
  };
}

/**
 * Legacy flat list (desk + charter). Prefer `buildNetworkBrowsePanelPackage`.
 * Kept so any older callers still receive copyable blocks.
 */
export function networkBrowseSnapshotItems(input: {
  cards: V2NetworkBrowseCard[];
  summary: V2NetworkBrowseSummary;
  insights: V2NetworkBrowseInsight;
}): SnapshotMenuItem[] {
  return [
    {
      id: "network-desk",
      label: "Network desk snapshot",
      description: "Browse summary, status counts, due/dormant highlights",
      text: wrapSnapshotText(
        "Network desk snapshot",
        buildNetworkAiSnapshot({
          scope: "network-desk",
          desk: input,
        })
      ),
    },
    networkCharterSnapshotItem(),
  ];
}

/**
 * Legacy flat list (person + charter). Prefer `buildNetworkContactPanelPackage`.
 */
export function networkContactSnapshotItems(page: NetworkContactPageData): SnapshotMenuItem[] {
  return [
    {
      id: "network-person",
      label: `${page.entity.name} · contact`,
      description: "Contact context, timeline snippet, dialogue or relationship overview",
      text: wrapSnapshotText(
        `${page.entity.name} contact snapshot`,
        buildNetworkAiSnapshot({
          scope: "network-person",
          person: page,
        })
      ),
    },
    networkCharterSnapshotItem(),
  ];
}

export { buildNetworkBrowsePanelPackage, buildNetworkContactPanelPackage };
