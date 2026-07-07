import type { Entity, InboxItem, InboxSource, InboxStatus } from "../types";
import type { EnrichedInboxItem } from "../inbox-enrich";
import { INBOX_SOURCE_LABELS } from "../labels";
import { entityReferenceKind } from "../link-hierarchy";
import { REFERENCE_KIND_LABELS } from "../reference-types";
import { relativeActivityLabel } from "./timeline-builders";

export type V2InboxTab = "all" | "unread" | "in_progress" | "processed" | "archived";

export interface V2InboxTag {
  id: string;
  name: string;
  tone: "blue" | "orange" | "default";
}

export interface V2InboxRow {
  id: string;
  sender: string;
  senderInitials: string;
  subject: string;
  preview: string;
  timeLabel: string;
  status: InboxStatus;
  statusLabel: string;
  statusTone: "violet" | "amber" | "emerald" | "zinc";
  tags: V2InboxTag[];
  unread: boolean;
  isPrivate: boolean;
  attachmentCount: number;
  source: InboxSource;
  senderKey: string;
  entityKinds: V2InboxDetailEntity["kind"][];
  entityIds: string[];
  topicTags: string[];
}

export type V2InboxEntityKind = V2InboxDetailEntity["kind"];

export interface V2InboxFilters {
  source?: InboxSource;
  sender?: string;
  type?: V2InboxEntityKind;
  entityId?: string;
  tag?: string;
}

export interface V2InboxFilterOptions {
  sources: InboxSource[];
  senders: Array<{ key: string; label: string }>;
  types: V2InboxEntityKind[];
  entities: Array<{ id: string; name: string }>;
  tags: string[];
}

export interface V2InboxDetailEntity {
  id: string;
  name: string;
  label: string;
  href: string;
  kind: "organization" | "project" | "person" | "topic" | "event" | "other";
}

const STATUS_UI: Record<
  InboxStatus,
  { tab: V2InboxTab; label: string; tone: V2InboxRow["statusTone"] }
> = {
  pending: { tab: "unread", label: "Unread", tone: "violet" },
  linked: { tab: "in_progress", label: "In Progress", tone: "amber" },
  converted: { tab: "processed", label: "Processed", tone: "emerald" },
  archived: { tab: "archived", label: "Archived", tone: "zinc" },
};

function senderName(from?: string): string {
  if (!from) return "Unknown sender";
  return from.replace(/<.*>/, "").trim() || from;
}

function senderKey(from?: string): string {
  const raw = from?.trim() || "";
  const email = raw.match(/<([^>]+)>/)?.[1] ?? raw;
  return email.trim().toLowerCase() || "unknown";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function entityTag(entity: Entity): V2InboxTag {
  const tone =
    entity.type === "project" ? "blue" : entity.type === "company" ? "orange" : "default";
  return { id: entity.id, name: entity.name, tone };
}

function entityKind(entity: Entity): V2InboxDetailEntity["kind"] {
  const kind = entityReferenceKind(entity);
  if (kind) return kind;
  return "other";
}

export function entityToV2InboxDetail(entity: Entity): V2InboxDetailEntity {
  const kind = entityKind(entity);
  const label =
    kind === "other" ? "Reference" : REFERENCE_KIND_LABELS[kind as keyof typeof REFERENCE_KIND_LABELS];

  let href = `/argus/network/${entity.id}`;
  if (kind === "organization") href = `/argus/v2/organizations/${entity.id}`;
  else if (kind === "project") href = `/argus/v2/projects/${entity.id}`;
  else if (kind === "topic") href = `/argus/v2/browse/topics?selected=${entity.id}`;
  else if (kind === "event") href = `/argus/v2/browse/events?selected=${entity.id}`;

  return {
    id: entity.id,
    name: entity.name,
    label,
    href,
    kind,
  };
}

export function buildV2InboxRows(
  enriched: EnrichedInboxItem[],
  entities: Entity[],
  today: string
): V2InboxRow[] {
  const entityMap = new Map(entities.map((e) => [e.id, e]));

  return enriched
    .map(({ item, view }) => {
      const ui = STATUS_UI[item.status];
      const linkedEntities = (item.linkedEntityIds ?? [])
        .map((id) => entityMap.get(id))
        .filter((e): e is Entity => Boolean(e));
      const linked = linkedEntities.slice(0, 3).map(entityTag);

      const received = item.receivedAt || view.receivedAt;
      const timeLabel = formatInboxTime(received, today);

      return {
        id: item.id,
        sender: senderName(view.from),
        senderInitials: initials(senderName(view.from)),
        subject: view.subject || "(No subject)",
        preview: view.textBody.replace(/\s+/g, " ").slice(0, 120),
        timeLabel,
        status: item.status,
        statusLabel: ui.label,
        statusTone: ui.tone,
        tags: linked,
        unread: item.status === "pending",
        isPrivate: Boolean(item.private),
        attachmentCount: item.attachmentIds.length,
        source: item.source,
        senderKey: senderKey(view.from),
        entityKinds: [...new Set(linkedEntities.map((entity) => entityKind(entity)))],
        entityIds: linkedEntities.map((entity) => entity.id),
        topicTags: item.topics ?? [],
      };
    })
    .sort((a, b) => {
      const rowA = enriched.find((e) => e.item.id === a.id);
      const rowB = enriched.find((e) => e.item.id === b.id);
      const ai = rowA?.item.receivedAt ?? "";
      const bi = rowB?.item.receivedAt ?? "";
      return bi.localeCompare(ai);
    });
}

export function buildV2InboxTabCounts(rows: V2InboxRow[]) {
  return {
    all: rows.length,
    unread: rows.filter((r) => r.status === "pending").length,
    in_progress: rows.filter((r) => r.status === "linked").length,
    processed: rows.filter((r) => r.status === "converted").length,
    archived: rows.filter((r) => r.status === "archived").length,
  };
}

export function filterV2InboxRows(rows: V2InboxRow[], tab: V2InboxTab, filters: V2InboxFilters = {}): V2InboxRow[] {
  let result = rows;
  if (tab === "unread") result = result.filter((r) => r.status === "pending");
  else if (tab === "in_progress") result = result.filter((r) => r.status === "linked");
  else if (tab === "processed") result = result.filter((r) => r.status === "converted");
  else if (tab === "archived") result = result.filter((r) => r.status === "archived");

  if (filters.source) result = result.filter((row) => row.source === filters.source);
  if (filters.sender) result = result.filter((row) => row.senderKey === filters.sender);
  if (filters.type) result = result.filter((row) => row.entityKinds.includes(filters.type!));
  if (filters.entityId) result = result.filter((row) => row.entityIds.includes(filters.entityId!));
  if (filters.tag) {
    const tag = filters.tag.toLowerCase();
    result = result.filter(
      (row) =>
        row.topicTags.some((value) => value.toLowerCase() === tag) ||
        row.tags.some((value) => value.name.toLowerCase() === tag)
    );
  }

  return result;
}

const ENTITY_KIND_LABELS: Record<V2InboxEntityKind, string> = {
  organization: "Organization",
  project: "Project",
  person: "Person",
  topic: "Topic",
  event: "Event",
  other: "Reference",
};

export function inboxEntityKindLabel(kind: V2InboxEntityKind): string {
  return ENTITY_KIND_LABELS[kind];
}

export function buildV2InboxFilterOptions(rows: V2InboxRow[]): V2InboxFilterOptions {
  const sources = [...new Set(rows.map((row) => row.source))].sort();
  const senderMap = new Map<string, string>();
  for (const row of rows) senderMap.set(row.senderKey, row.sender);
  const senders = [...senderMap.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const types = [...new Set(rows.flatMap((row) => row.entityKinds))].sort();
  const entityMap = new Map<string, string>();
  for (const row of rows) {
    for (const tag of row.tags) entityMap.set(tag.id, tag.name);
  }
  const entities = [...entityMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const tags = [
    ...new Set(rows.flatMap((row) => [...row.topicTags, ...row.tags.map((tag) => tag.name)])),
  ].sort((a, b) => a.localeCompare(b));

  return { sources, senders, types, entities, tags };
}

export function parseV2InboxFilters(params: {
  source?: string | null;
  sender?: string | null;
  type?: string | null;
  entity?: string | null;
  tag?: string | null;
}): V2InboxFilters {
  const filters: V2InboxFilters = {};
  const source = params.source?.trim();
  if (source === "manual" || source === "api" || source === "email" || source === "file") {
    filters.source = source;
  }

  const sender = params.sender?.trim();
  if (sender) filters.sender = sender.toLowerCase();

  const type = params.type?.trim();
  if (type === "organization" || type === "project" || type === "person" || type === "topic" || type === "event" || type === "other") {
    filters.type = type;
  }

  const entityId = params.entity?.trim();
  if (entityId) filters.entityId = entityId;

  const tag = params.tag?.trim();
  if (tag) filters.tag = tag;

  return filters;
}

export function inboxSourceLabel(source: InboxSource): string {
  return INBOX_SOURCE_LABELS[source];
}

export function hasActiveV2InboxFilters(filters: V2InboxFilters): boolean {
  return Boolean(filters.source || filters.sender || filters.type || filters.entityId || filters.tag);
}

export function buildV2InboxDetailEntities(item: InboxItem, entities: Entity[]): V2InboxDetailEntity[] {
  return (item.linkedEntityIds ?? [])
    .map((id) => entities.find((e) => e.id === id))
    .filter((e): e is Entity => Boolean(e))
    .map(entityToV2InboxDetail);
}

function formatInboxTime(iso: string, today: string): string {
  const date = iso.slice(0, 10);
  const time = new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = relativeActivityLabel(iso, today);
  if (day === "Today") return `Today ${time}`;
  if (day === "Yesterday") return `Yesterday ${time}`;
  return `${date.slice(5).replace("-", "/")} ${time}`;
}

export function parseV2InboxTab(value: string | undefined): V2InboxTab {
  if (value === "unread" || value === "in_progress" || value === "processed" || value === "archived") {
    return value;
  }
  return "all";
}

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

/** Keyword tags inferred from subject/body for the inbox detail panel. */
export function suggestInboxTags(subject: string, body: string, linkedEntities: V2InboxDetailEntity[]): string[] {
  const tags = new Set<string>();
  const text = `${subject} ${body}`.toLowerCase();
  for (const match of text.match(/\b[a-z0-9]{3,}\b/g) ?? []) {
    if (!TAG_STOPWORDS.has(match)) tags.add(match);
  }
  for (const entity of linkedEntities) {
    for (const token of entity.name.toLowerCase().split(/[\s\-_/]+/)) {
      if (token.length > 2 && !TAG_STOPWORDS.has(token)) tags.add(token);
    }
  }
  return [...tags].slice(0, 10);
}

/** Entity suggestions from name matches in email subject/body. */
export function suggestInboxEntities(
  subject: string,
  body: string,
  entities: Entity[],
  linkedIds: string[]
): V2InboxDetailEntity[] {
  const haystack = `${subject}\n${body}`.toLowerCase();
  const linked = new Set(linkedIds);

  return entities
    .filter((entity) => !entity.deletedAt && !linked.has(entity.id))
    .filter((entity) => {
      const name = entity.name.trim().toLowerCase();
      if (name.length < 3) return false;
      if (haystack.includes(name)) return true;
      return name.split(/\s+/).some((part) => part.length > 3 && haystack.includes(part));
    })
    .slice(0, 6)
    .map(entityToV2InboxDetail);
}
