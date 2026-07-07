import type { ArgusData, Entity } from "../types";
import { referenceKindFromNotes } from "../reference-types";
import { entitiesByKind } from "./hierarchy";

const TAG_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "have",
  "your",
  "well",
  "are",
  "was",
  "will",
  "not",
  "but",
  "you",
  "our",
  "all",
  "can",
  "has",
  "had",
  "its",
  "any",
  "may",
  "new",
  "re",
  "fw",
]);

/** Collapse spacing/hyphens so "hand over" and "handover" match. */
export function normalizeSignalToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, "");
}

export function isTopicEntity(entity: Entity): boolean {
  return entity.type === "other" && referenceKindFromNotes(entity.notes ?? "") === "topic";
}

function observedTopicTags(data: ArgusData, topicId: string): string[] {
  const tags = new Set<string>();
  for (const log of data.logs) {
    if (log.deletedAt || !log.entityIds.includes(topicId)) continue;
    for (const topic of log.topics) {
      const key = topic.trim().toLowerCase();
      if (key) tags.add(key);
    }
  }
  return [...tags];
}

export type InboxTopicContext = {
  topicEntries: Array<{
    id: string;
    entity: Entity;
    aliases: string[];
    signals: string[];
  }>;
};

export function buildInboxTopicContext(data: ArgusData): InboxTopicContext {
  const index = buildTopicSignalIndex(data);
  return {
    topicEntries: [...index.entries()].map(([id, entry]) => ({
      id,
      entity: entry.entity,
      aliases: entry.aliases,
      signals: [...entry.signals],
    })),
  };
}

export function topicIndexFromContext(context: InboxTopicContext): TopicSignalIndex {
  const index: TopicSignalIndex = new Map();
  for (const entry of context.topicEntries) {
    index.set(entry.id, {
      entity: entry.entity,
      aliases: entry.aliases,
      signals: new Set(entry.signals),
    });
  }
  return index;
}

export type TopicSignalIndex = Map<
  string,
  {
    entity: Entity;
    signals: Set<string>;
    aliases: string[];
  }
>;

export function buildTopicSignalIndex(data: ArgusData): TopicSignalIndex {
  const index: TopicSignalIndex = new Map();
  for (const topic of entitiesByKind(data).topics) {
    const signals = new Set<string>();
    const aliases: string[] = [];

    const nameNorm = normalizeSignalToken(topic.name);
    if (nameNorm.length >= 2) signals.add(nameNorm);
    for (const part of topic.name.split(/[\s\-_/]+/)) {
      const norm = normalizeSignalToken(part);
      if (norm.length >= 3) signals.add(norm);
    }

    for (const alias of topic.linkedTags ?? []) {
      const trimmed = alias.trim().toLowerCase();
      if (!trimmed) continue;
      aliases.push(trimmed);
      signals.add(normalizeSignalToken(trimmed));
    }

    for (const observed of observedTopicTags(data, topic.id)) {
      signals.add(normalizeSignalToken(observed));
    }

    index.set(topic.id, { entity: topic, signals, aliases });
  }
  return index;
}

export function extractContextTokens(subject: string, body: string): Set<string> {
  const tokens = new Set<string>();
  const text = `${subject}\n${body}`.toLowerCase();
  for (const match of text.match(/\b[a-z0-9]{3,}\b/g) ?? []) {
    if (!TAG_STOPWORDS.has(match)) tokens.add(normalizeSignalToken(match));
  }
  const subjectNorm = normalizeSignalToken(subject);
  if (subjectNorm.length >= 4) tokens.add(subjectNorm);
  return tokens;
}

export type EntityMatchScore = {
  entity: Entity;
  score: number;
  reason?: string;
};

function scoreEntityAgainstContext(
  entity: Entity,
  haystack: string,
  contextTokens: Set<string>,
  topicIndex: TopicSignalIndex
): EntityMatchScore | null {
  const name = entity.name.trim();
  if (name.length < 2) return null;

  const nameLower = name.toLowerCase();
  let score = 0;
  let reason: string | undefined;

  if (haystack.includes(nameLower)) {
    score += 10;
    reason = "name in email";
  }

  for (const part of name.split(/[\s\-_/]+/)) {
    if (part.length > 3 && haystack.includes(part.toLowerCase())) {
      score += 4;
      reason ??= `“${part}” in email`;
    }
  }

  if (isTopicEntity(entity)) {
    const entry = topicIndex.get(entity.id);
    if (entry) {
      for (const alias of entry.aliases) {
        const aliasNorm = normalizeSignalToken(alias);
        if (contextTokens.has(aliasNorm)) {
          score += 12;
          reason = `tag “${alias}”`;
        } else if (haystack.includes(alias.toLowerCase())) {
          score += 8;
          reason = `tag “${alias}”`;
        }
      }
      for (const signal of entry.signals) {
        if (signal.length >= 4 && contextTokens.has(signal)) {
          score += 6;
          reason ??= "topic signal";
        }
      }
    }
  }

  if (score === 0) return null;
  return { entity, score, reason };
}

/** Ranked entity suggestions — topics boost on alias/signal overlap. */
export function rankInboxEntitySuggestions(
  subject: string,
  body: string,
  entities: Entity[],
  linkedIds: string[],
  data: ArgusData | InboxTopicContext,
  limit = 6
): EntityMatchScore[] {
  const haystack = `${subject}\n${body}`.toLowerCase();
  const linked = new Set(linkedIds);
  const contextTokens = extractContextTokens(subject, body);
  const topicIndex =
    "topicEntries" in data ? topicIndexFromContext(data) : buildTopicSignalIndex(data);

  return entities
    .filter((entity) => !entity.deletedAt && !linked.has(entity.id))
    .map((entity) => scoreEntityAgainstContext(entity, haystack, contextTokens, topicIndex))
    .filter((row): row is EntityMatchScore => Boolean(row))
    .sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name))
    .slice(0, limit);
}

/** Tokens from email context that match any topic signal (for inbox tag filter). */
export function contextTopicAliasMatches(
  subject: string,
  preview: string,
  topicIndex: TopicSignalIndex
): string[] {
  const tokens = extractContextTokens(subject, preview);
  const matches = new Set<string>();
  for (const { signals, aliases } of topicIndex.values()) {
    for (const alias of aliases) {
      if (tokens.has(normalizeSignalToken(alias))) matches.add(alias.toLowerCase());
    }
    for (const signal of signals) {
      if (signal.length >= 4 && tokens.has(signal)) {
        for (const alias of aliases) matches.add(alias.toLowerCase());
      }
    }
  }
  return [...matches];
}

export function linkedTopicAliasTags(linkedEntities: Entity[]): string[] {
  return [
    ...new Set(
      linkedEntities
        .filter(isTopicEntity)
        .flatMap((topic) => (topic.linkedTags ?? []).map((tag) => tag.trim().toLowerCase()))
        .filter(Boolean)
    ),
  ];
}

export function inboxRowMatchesTagFilter(
  row: {
    topicTags: string[];
    tags: Array<{ name: string }>;
    linkedTopicAliases: string[];
    contextTopicMatches: string[];
  },
  tag: string
): boolean {
  const normalized = tag.trim().toLowerCase();
  const normCompact = normalizeSignalToken(normalized);
  if (
    row.topicTags.some((value) => value.toLowerCase() === normalized) ||
    row.tags.some((value) => value.name.toLowerCase() === normalized)
  ) {
    return true;
  }
  if (row.linkedTopicAliases.some((value) => value === normalized)) return true;
  if (row.contextTopicMatches.some((value) => value === normalized)) return true;
  if (
    row.contextTopicMatches.some((value) => normalizeSignalToken(value) === normCompact) ||
    row.linkedTopicAliases.some((value) => normalizeSignalToken(value) === normCompact)
  ) {
    return true;
  }
  return false;
}
