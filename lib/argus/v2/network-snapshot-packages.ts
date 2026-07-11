import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import { buildArgusNetworkBrief } from "../network-ai-brief";
import { buildNetworkAiSnapshot } from "../network-ai-snapshot";
import type {
  V2NetworkBrowseCard,
  V2NetworkBrowseInsight,
  V2NetworkBrowseSummary,
} from "./network-browse-utils";
import type { NetworkContactPageData } from "./network-contact-loaders";

export function networkCharterSnapshotItem(): SnapshotMenuItem {
  return {
    id: "network-charter",
    label: "Network charter brief",
    description: "ARGUS rules, past vs future, human Apply gate",
    text: buildArgusNetworkBrief(),
  };
}

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
      text: buildNetworkAiSnapshot({
        scope: "network-desk",
        desk: input,
      }),
    },
    networkCharterSnapshotItem(),
  ];
}

export function networkContactSnapshotItems(page: NetworkContactPageData): SnapshotMenuItem[] {
  return [
    {
      id: "network-person",
      label: `${page.entity.name} snapshot`,
      description: "Contact context, timeline snippet, dialogue or relationship overview",
      text: buildNetworkAiSnapshot({
        scope: "network-person",
        person: page,
      }),
    },
    networkCharterSnapshotItem(),
  ];
}
