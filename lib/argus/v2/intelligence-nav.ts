import type { V2KnowledgeNodeKind } from "./intelligence-viz";

export type IntelligenceFrom = "intelligence" | "portfolio" | "treemap" | "tags";

/** Focused destination after Intelligence click — not the full browse catalog. */
export function intelligenceEntityHref(
  kind: V2KnowledgeNodeKind,
  entityId: string,
  from: IntelligenceFrom = "intelligence"
): string {
  const fromParam = `from=${from}`;
  if (kind === "organization") {
    return `/argus/v2/organizations/${entityId}?${fromParam}`;
  }
  if (kind === "project") {
    return `/argus/v2/projects/${entityId}?${fromParam}`;
  }
  return `/argus/v2/browse/topics?selected=${entityId}&focus=1&${fromParam}`;
}

export function intelligenceTagHref(tagName: string, topicEntityId?: string | null): string {
  if (topicEntityId) {
    return `/argus/v2/browse/topics?selected=${topicEntityId}&focus=1&from=tags&tag=${encodeURIComponent(tagName)}`;
  }
  return `/argus/v2/inbox?tag=${encodeURIComponent(tagName)}&from=tags`;
}

export function intelligenceEventHref(entityId: string, from: IntelligenceFrom = "intelligence"): string {
  return `/argus/v2/browse/events?selected=${entityId}&focus=1&from=${from}`;
}

export function parseIntelligenceFocus(searchParams: {
  get: (key: string) => string | null;
}): {
  focus: boolean;
  from: IntelligenceFrom | null;
  tag: string | null;
} {
  const from = searchParams.get("from");
  const validFrom =
    from === "intelligence" || from === "portfolio" || from === "treemap" || from === "tags"
      ? from
      : null;
  return {
    focus: searchParams.get("focus") === "1",
    from: validFrom,
    tag: searchParams.get("tag"),
  };
}

export function intelligenceBrowseAllHref(kind: "topics" | "events"): string {
  return `/argus/v2/browse/${kind}`;
}

export function clearIntelligenceFocusHref(pathname: string, searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("focus");
  params.delete("from");
  params.delete("tag");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Match tag string to a topic entity by name or alias. */
export function findTopicEntityIdForTag(topics: { id: string; name: string; linkedTags?: string[] }[], tagName: string): string | null {
  const key = tagName.trim().toLowerCase();
  for (const topic of topics) {
    if (topic.name.trim().toLowerCase() === key) return topic.id;
    for (const alias of topic.linkedTags ?? []) {
      if (alias.trim().toLowerCase() === key) return topic.id;
    }
  }
  return null;
}

export const INTELLIGENCE_FROM_LABELS: Record<IntelligenceFrom, string> = {
  intelligence: "Intelligence",
  portfolio: "Portfolio",
  treemap: "Treemap",
  tags: "Tags",
};
