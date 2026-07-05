import type { Entity, InboxItem, InboxStatus } from "../types";
import type { EnrichedInboxItem } from "../inbox-enrich";
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
  statusTone: "violet" | "amber" | "zinc";
  tags: V2InboxTag[];
  unread: boolean;
  isPrivate: boolean;
  attachmentCount: number;
}

export interface V2InboxDetailEntity {
  id: string;
  name: string;
  label: string;
  href: string;
  kind: "organization" | "project" | "person" | "other";
}

const STATUS_UI: Record<
  InboxStatus,
  { tab: V2InboxTab; label: string; tone: V2InboxRow["statusTone"] }
> = {
  pending: { tab: "unread", label: "Unread", tone: "violet" },
  linked: { tab: "in_progress", label: "In Progress", tone: "amber" },
  converted: { tab: "processed", label: "Processed", tone: "zinc" },
  archived: { tab: "archived", label: "Archived", tone: "zinc" },
};

function senderName(from?: string): string {
  if (!from) return "Unknown sender";
  return from.replace(/<.*>/, "").trim() || from;
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
  if (entity.type === "company") return "organization";
  if (entity.type === "project") return "project";
  if (entity.type === "person") return "person";
  return "other";
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
      const linked = (item.linkedEntityIds ?? [])
        .map((id) => entityMap.get(id))
        .filter((e): e is Entity => Boolean(e))
        .slice(0, 3)
        .map(entityTag);

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

export function filterV2InboxRows(rows: V2InboxRow[], tab: V2InboxTab): V2InboxRow[] {
  if (tab === "all") return rows;
  if (tab === "unread") return rows.filter((r) => r.status === "pending");
  if (tab === "in_progress") return rows.filter((r) => r.status === "linked");
  if (tab === "processed") return rows.filter((r) => r.status === "converted");
  return rows.filter((r) => r.status === "archived");
}

export function buildV2InboxDetailEntities(item: InboxItem, entities: Entity[]): V2InboxDetailEntity[] {
  return (item.linkedEntityIds ?? [])
    .map((id) => entities.find((e) => e.id === id))
    .filter((e): e is Entity => Boolean(e))
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      label: entity.type === "company" ? "Organization" : entity.type === "project" ? "Project" : "Person",
      href:
        entity.type === "company"
          ? `/argus/v2/organizations/${entity.id}`
          : entity.type === "project"
            ? `/argus/v2/projects/${entity.id}`
            : `/argus/network/${entity.id}`,
      kind: entityKind(entity),
    }));
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
