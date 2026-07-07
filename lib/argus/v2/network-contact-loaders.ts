import type { ArgusData, Entity, InboxItem, Log } from "../types";
import type { EnrichedInboxItem } from "../inbox-enrich";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import { entityNotesForDisplay, referenceKindFromNotes } from "../reference-types";
import { buildEntityIntelligence, type EntityIntelligence } from "../network-intelligence";
import {
  deriveRelationshipAttention,
  type DerivedRelationshipAttention,
} from "../network-relationship-metrics";
import { getInboxCardsForEntity } from "../inbox-entity-links";
import { entitiesByKind } from "./hierarchy";

export type NetworkContactTimelineItem =
  | { kind: "journal"; id: string; title: string; preview: string; date: string; sortIso: string; href: string }
  | { kind: "email"; id: string; title: string; preview: string; date: string; sortIso: string; href: string };

export type NetworkContactRelatedOrg = {
  id: string;
  name: string;
  relation: string;
  href: string;
};

export type NetworkContactPageData = {
  entity: Entity;
  role: string;
  organization: { id: string; name: string; href: string } | null;
  location: string | null;
  email: string | null;
  linkedIn: string | null;
  industry: string | null;
  tags: string[];
  relatedOrganizations: NetworkContactRelatedOrg[];
  relatedProjects: Array<{ id: string; name: string; href: string }>;
  relatedTopics: Array<{ id: string; name: string; href: string }>;
  intel: EntityIntelligence;
  attention: DerivedRelationshipAttention;
  timeline: NetworkContactTimelineItem[];
  fileCount: number;
};

function personRole(person: Entity): string {
  if (person.alias?.trim()) return person.alias.trim();
  const notes = entityNotesForDisplay(person.notes ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (notes[0]) return notes[0].slice(0, 80);
  return "Professional contact";
}

function personOrganization(
  data: ArgusData,
  person: Entity
): { id: string; name: string } | null {
  for (const id of person.linkedEntityIds ?? []) {
    const entity = data.entities.find((e) => e.id === id && e.type === "company" && !e.deletedAt);
    if (entity) return { id: entity.id, name: entity.name };
  }
  for (const org of entitiesByKind(data).organizations) {
    const linked = [...(org.linkedPersonIds ?? []), ...(org.linkedEntityIds ?? [])];
    if (linked.includes(person.id)) return { id: org.id, name: org.name };
  }
  return null;
}

function extractEmail(notes: string): string | null {
  const match = notes.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  return match ? match[0] : null;
}

function extractLinkedIn(notes: string): string | null {
  const match = notes.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s)]+/i);
  return match ? match[0] : null;
}

function extractLocation(notes: string): string | null {
  const lines = entityNotesForDisplay(notes).split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(1, 4)) {
    if (line.length > 80 || /@|https?:\/\//i.test(line)) continue;
    if (/[A-Z][a-z]+/.test(line)) return line;
  }
  return null;
}

function extractIndustry(notes: string): string | null {
  const match = entityNotesForDisplay(notes).match(/(?:^|\n)\s*industry:\s*(.+)/i);
  return match ? match[1].trim() : null;
}

function relatedOrganizations(data: ArgusData, person: Entity): NetworkContactRelatedOrg[] {
  const orgs = new Map<string, NetworkContactRelatedOrg>();
  const primary = personOrganization(data, person);
  if (primary) {
    orgs.set(primary.id, {
      id: primary.id,
      name: primary.name,
      relation: "Primary",
      href: `/argus/v2/organizations/${primary.id}`,
    });
  }
  for (const id of person.linkedEntityIds ?? []) {
    const entity = data.entities.find((e) => e.id === id && e.type === "company" && !e.deletedAt);
    if (!entity || orgs.has(entity.id)) continue;
    orgs.set(entity.id, {
      id: entity.id,
      name: entity.name,
      relation: "Linked",
      href: `/argus/v2/organizations/${entity.id}`,
    });
  }
  return [...orgs.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function relatedProjects(data: ArgusData, personId: string) {
  return data.entities
    .filter(
      (e) =>
        e.type === "project" &&
        !e.deletedAt &&
        ((e.linkedPersonIds ?? []).includes(personId) || (e.linkedEntityIds ?? []).includes(personId))
    )
    .map((project) => ({
      id: project.id,
      name: project.name,
      href: `/argus/v2/projects/${project.id}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function relatedTopics(data: ArgusData, person: Entity) {
  return (person.linkedEntityIds ?? [])
    .map((id) => data.entities.find((e) => e.id === id && !e.deletedAt))
    .filter((e): e is Entity => Boolean(e))
    .filter((e) => referenceKindFromNotes(e.notes ?? "") === "topic")
    .map((topic) => ({
      id: topic.id,
      name: topic.name,
      href: `/argus/v2/browse/topics?selected=${topic.id}`,
    }));
}

function buildTimeline(logs: Log[], enrichedInbox: EnrichedInboxItem[]): NetworkContactTimelineItem[] {
  const items: NetworkContactTimelineItem[] = [];
  for (const log of logs) {
    items.push({
      kind: "journal",
      id: log.id,
      title: log.title || "Journal entry",
      preview: log.body.replace(/\s+/g, " ").slice(0, 140),
      date: log.date,
      sortIso: log.date,
      href: `/argus/logs/${log.id}`,
    });
  }
  for (const { item, view } of enrichedInbox) {
    items.push({
      kind: "email",
      id: item.id,
      title: view.subject || "(No subject)",
      preview: view.textBody.replace(/\s+/g, " ").slice(0, 140),
      date: item.receivedAt,
      sortIso: item.receivedAt,
      href: `/argus/v2/inbox?selected=${item.id}`,
    });
  }
  return items.sort((a, b) => b.sortIso.localeCompare(a.sortIso));
}

export function buildNetworkContactPageData(input: {
  data: ArgusData;
  entity: Entity;
  inboxItems: InboxItem[];
  logs: Log[];
  enrichedInbox: EnrichedInboxItem[];
  includePrivate: boolean;
  today: string;
}): NetworkContactPageData {
  const { data, entity, inboxItems, logs, enrichedInbox, includePrivate, today } = input;
  const notes = entity.notes ?? "";
  const intel = buildEntityIntelligence(data, entity, includePrivate, today);
  const pendingInboxCount = getInboxCardsForEntity(inboxItems, entity.id, includePrivate).length;
  const attention = deriveRelationshipAttention({ entity, intel, pendingInboxCount, today });
  const organization = personOrganization(data, entity);
  const fileCount = logs.reduce((sum, log) => sum + log.attachmentIds.length, 0);

  return {
    entity,
    role: personRole(entity),
    organization: organization
      ? { id: organization.id, name: organization.name, href: `/argus/v2/organizations/${organization.id}` }
      : null,
    location: extractLocation(notes),
    email: extractEmail(notes),
    linkedIn: extractLinkedIn(notes),
    industry: extractIndustry(notes),
    tags: [...new Set([...(entity.linkedTags ?? []), ...intel.topics])].slice(0, 12),
    relatedOrganizations: relatedOrganizations(data, entity),
    relatedProjects: relatedProjects(data, entity.id),
    relatedTopics: relatedTopics(data, entity),
    intel,
    attention,
    timeline: buildTimeline(logs, enrichedInbox),
    fileCount,
  };
}

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
