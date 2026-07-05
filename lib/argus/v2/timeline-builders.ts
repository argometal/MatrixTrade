import type { InboxItem, Log } from "../types";
import type { V2TimelineEntry, V2TimelineKind } from "./mock-data";

function logJournalSubtype(log: Log): "log" | "note" {
  return log.kind === "log" ? "log" : "note";
}

function logTimelineKind(log: Log): V2TimelineKind {
  if (log.kind === "event") {
    const text = `${log.title} ${log.body}`.toLowerCase();
    if (/\bmeeting\b|\bcall\b|\bworkshop\b/.test(text)) return "meeting";
  }
  return "journal";
}

export function logToTimelineEntry(log: Log): V2TimelineEntry {
  const kind = logTimelineKind(log);
  return {
    id: log.id,
    date: log.date.slice(0, 10),
    time: formatTimeFromIso(log.updatedAt || log.createdAt || log.date),
    kind,
    journalSubtype: kind === "journal" ? logJournalSubtype(log) : undefined,
    title: log.title || (log.kind === "log" ? "Log entry" : "Note"),
    body: log.body?.trim() || undefined,
    tags: log.topics.length ? log.topics : undefined,
    protected: log.private,
  };
}

export function inboxToTimelineEntry(item: InboxItem): V2TimelineEntry {
  const subject = item.subject?.trim() || item.rawText?.slice(0, 80)?.trim() || "Email";
  const from = item.from?.trim();
  return {
    id: item.id,
    date: item.receivedAt.slice(0, 10),
    time: formatTimeFromIso(item.receivedAt),
    kind: "email",
    title: from ? `Email from ${from}` : subject,
    body: item.subject ? item.rawText?.slice(0, 200)?.trim() : undefined,
    protected: item.private,
  };
}

export function mergeTimelineEntries(entries: V2TimelineEntry[]): V2TimelineEntry[] {
  return [...entries].sort((a, b) => {
    const dc = b.date.localeCompare(a.date);
    if (dc !== 0) return dc;
    return (b.time ?? "").localeCompare(a.time ?? "");
  });
}

export function buildTimelineFromLogsAndInbox(logs: Log[], inbox: InboxItem[]): V2TimelineEntry[] {
  return mergeTimelineEntries([
    ...logs.map(logToTimelineEntry),
    ...inbox.map(inboxToTimelineEntry),
  ]);
}

function formatTimeFromIso(iso: string): string | undefined {
  if (!iso || iso.length < 11) return undefined;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return undefined;
  }
}

export function relativeActivityLabel(iso: string | undefined, today: string): string {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  if (day === today) return "Today";
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);
  if (day === y) return "Yesterday";
  const diff = Math.floor(
    (Date.parse(`${today}T12:00:00`) - Date.parse(`${day}T12:00:00`)) / (86400000)
  );
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
