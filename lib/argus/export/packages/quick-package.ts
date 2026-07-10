import type { ArgusData, Attachment, InboxItem, Log } from "../../types";
import { buildEntityEvidenceStream } from "../../v2/evidence-stream";
import { buildTimelineFromLogsAndInbox } from "../../v2/timeline-builders";
import type { DeliverBranding } from "../deliver-branding";
import { evidenceRecordCount } from "../dedup";
import type { CollectedVaultEvidence, ExportScopeType, QuickDeliverSummary } from "../types";
import { emailSnippet, logSnippet } from "./deliver-html-shared";

const SCOPE_LABELS: Record<ExportScopeType, string> = {
  person: "Person",
  project: "Project",
  organization: "Organization",
  topic: "Topic",
  event: "Event",
};

function entityLabel(data: ArgusData, entityId: string): string {
  const entity = data.entities.find((e) => e.id === entityId && !e.deletedAt);
  if (!entity) return entityId;
  const kind = entity.type === "company" ? "Org" : entity.type === "other" ? "Ref" : entity.type;
  return `${entity.name} (${kind})`;
}

function attachmentSourceLabel(att: Attachment, logs: Log[], inbox: InboxItem[]): string {
  if (att.parentType === "journal") {
    const log = logs.find((l) => l.id === att.parentId);
    return log ? `journal: ${log.title || log.id}` : "journal";
  }
  const item = inbox.find((i) => i.id === att.parentId);
  return item ? `email: ${item.subject || item.id}` : "email";
}

function mdEscape(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function timelineKindLabel(kind: string): string {
  if (kind === "email") return "Email";
  if (kind === "meeting") return "Meeting";
  if (kind === "journal") return "Journal";
  return kind;
}

export function buildQuickDeliverSummary(
  collected: CollectedVaultEvidence,
  generatedAt: string
): QuickDeliverSummary {
  return {
    scopeType: collected.scope.type,
    scopeId: collected.scope.id,
    scopeName: collected.scope.name,
    generatedAt,
    evidenceCount: evidenceRecordCount(collected.logs, collected.inbox),
    logCount: collected.logs.length,
    inboxCount: collected.inbox.length,
    fileCount: collected.attachments.length,
    relatedEntityCount: collected.relatedEntityIds.length,
    containsPrivate: collected.containsPrivate,
  };
}

export function buildActivitySummaryMarkdown(input: {
  data: ArgusData;
  inboxItems: InboxItem[];
  collected: CollectedVaultEvidence;
  includePrivate: boolean;
  today: string;
  generatedAt: string;
  branding: DeliverBranding;
}): string {
  const { data, inboxItems, collected, includePrivate, today, generatedAt, branding } = input;
  const { scope, logs, inbox, attachments, relatedEntityIds } = collected;
  const scopeLabel = SCOPE_LABELS[scope.type];
  const lines: string[] = [];

  lines.push(`# Activity Summary: ${scope.name}`);
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Scope type | ${scopeLabel} |`);
  lines.push(`| Subject | ${mdEscape(scope.name)} |`);
  lines.push(`| Prepared by | ${mdEscape(branding.preparerName)} |`);
  lines.push(`| Generated | ${generatedAt.slice(0, 10)} |`);
  lines.push(`| Evidence items | ${evidenceRecordCount(logs, inbox)} |`);
  lines.push(`| Emails | ${inbox.length} |`);
  lines.push(`| Journal entries | ${logs.length} |`);
  lines.push(`| Files (metadata) | ${attachments.length} |`);
  lines.push("");
  lines.push("_Chronological index of recorded activity. For full artifacts, use the Evidence Dossier export._");
  lines.push("");

  const timeline = buildTimelineFromLogsAndInbox(logs, inbox).reverse();
  lines.push("## Timeline");
  lines.push("");
  if (timeline.length === 0) {
    lines.push("_No evidence in scope._");
  } else {
    for (const entry of timeline) {
      const datePart = entry.time ? `${entry.date} ${entry.time}` : entry.date;
      const privateTag = entry.protected ? " 🔒" : "";
      lines.push(`### ${datePart} — ${timelineKindLabel(entry.kind)}${privateTag}`);
      lines.push("");
      lines.push(`**${mdEscape(entry.title)}**`);
      const body =
        entry.body?.trim() ||
        (entry.kind === "email"
          ? emailSnippet(inbox.find((e) => e.id === entry.id) ?? ({ rawText: "" } as InboxItem), 400)
          : entry.kind === "journal" || entry.kind === "meeting"
            ? logSnippet(logs.find((l) => l.id === entry.id) ?? ({ title: "", body: "" } as Log), 400)
            : "");
      if (body) {
        lines.push("");
        lines.push(`> ${body.split("\n").join("\n> ")}`);
      }
      if (entry.tags?.length) {
        lines.push("");
        lines.push(`Tags: ${entry.tags.map((t) => `\`${t}\``).join(", ")}`);
      }
      lines.push("");
    }
  }

  const stream = buildEntityEvidenceStream(data, scope.id, inboxItems, includePrivate, today);
  lines.push("## Evidence Index");
  lines.push("");
  if (stream.length === 0) {
    lines.push("_No linked evidence._");
  } else {
    lines.push("| Date | Kind | Title | Detail |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of stream) {
      let detail = item.title;
      if (item.kind === "email") {
        const email = inbox.find((e) => e.id === item.id.replace(/^email-/, ""));
        detail = email ? emailSnippet(email, 200) : item.title;
      } else if (item.kind === "journal") {
        const log = logs.find((l) => l.id === item.id.replace(/^journal-/, ""));
        detail = log ? logSnippet(log, 200) : item.title;
      }
      lines.push(
        `| ${item.sortIso.slice(0, 10)} | ${item.kind} | ${mdEscape(item.title)} | ${mdEscape(detail)} |`
      );
    }
  }
  lines.push("");

  lines.push("## Files (metadata only)");
  lines.push("");
  if (attachments.length === 0) {
    lines.push("_No attachments in scope._");
  } else {
    lines.push("| File | Type | Source |");
    lines.push("| --- | --- | --- |");
    for (const att of attachments) {
      lines.push(
        `| ${mdEscape(att.fileName)} | ${att.mimeType} | ${mdEscape(attachmentSourceLabel(att, logs, inbox))} |`
      );
    }
  }
  lines.push("");

  lines.push("## Linked Entities");
  lines.push("");
  if (relatedEntityIds.length === 0) {
    lines.push("_No related entities._");
  } else {
    for (const id of relatedEntityIds) {
      lines.push(`- ${entityLabel(data, id)}`);
    }
  }
  lines.push("");

  lines.push("---");
  lines.push(`_Delivered by ${branding.preparerName} · Activity Summary · ${generatedAt}_`);

  return lines.join("\n");
}

/** @deprecated Use buildActivitySummaryMarkdown */
export const buildQuickPackageMarkdown = buildActivitySummaryMarkdown;
