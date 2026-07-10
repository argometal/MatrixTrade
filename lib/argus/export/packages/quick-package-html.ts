import type { ArgusData, Attachment, InboxItem, Log } from "../../types";
import { buildEntityEvidenceStream } from "../../v2/evidence-stream";
import { buildTimelineFromLogsAndInbox } from "../../v2/timeline-builders";
import type { DeliverBranding } from "../deliver-branding";
import { evidenceRecordCount } from "../dedup";
import type { CollectedVaultEvidence, ExportScopeType } from "../types";
import {
  deliverFooterHtml,
  deliverReportStyles,
  emailSnippet,
  htmlEscape,
  logSnippet,
  textSnippet,
} from "./deliver-html-shared";

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

function timelineKindLabel(kind: string): string {
  if (kind === "email") return "Email";
  if (kind === "meeting") return "Meeting";
  if (kind === "journal") return "Journal";
  return kind;
}

function kindBadgeClass(kind: string): string {
  if (kind === "email") return "badge badge-email";
  if (kind === "journal") return "badge badge-journal";
  if (kind === "meeting") return "badge badge-meeting";
  return "badge";
}

function evidenceDetailForStreamItem(
  data: ArgusData,
  collected: CollectedVaultEvidence,
  item: { kind: string; id: string; title: string }
): string {
  const { logs, inbox } = collected;
  if (item.kind === "email") {
    const inboxId = item.id.replace(/^email-/, "");
    const email = inbox.find((e) => e.id === inboxId);
    return email ? emailSnippet(email, 300) : textSnippet(item.title, 300);
  }
  if (item.kind === "journal") {
    const logId = item.id.replace(/^journal-/, "");
    const log = logs.find((l) => l.id === logId);
    return log ? logSnippet(log, 300) : textSnippet(item.title, 300);
  }
  if (item.kind === "file" || item.kind === "photo") {
    const attId = item.id.replace(/^att-/, "");
    const att = data.attachments.find((a) => a.id === attId);
    return att ? `${att.fileName} (${att.mimeType})` : item.title;
  }
  return textSnippet(item.title, 300);
}

function enhancedTimelineBody(
  entry: { kind: string; id: string; body?: string; title: string },
  collected: CollectedVaultEvidence
): string | undefined {
  if (entry.body?.trim()) return entry.body.trim();
  if (entry.kind === "email") {
    const email = collected.inbox.find((e) => e.id === entry.id);
    if (email) return emailSnippet(email, 400) || undefined;
  }
  if (entry.kind === "journal" || entry.kind === "meeting") {
    const log = collected.logs.find((l) => l.id === entry.id);
    if (log) return log.body?.trim() || logSnippet(log, 400) || undefined;
  }
  return undefined;
}

export function buildActivitySummaryHtml(input: {
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
  const timeline = buildTimelineFromLogsAndInbox(logs, inbox).reverse();
  const stream = buildEntityEvidenceStream(data, scope.id, inboxItems, includePrivate, today);
  const evidenceTotal = evidenceRecordCount(logs, inbox);

  const timelineHtml =
    timeline.length === 0
      ? `<p class="muted">No evidence in scope.</p>`
      : timeline
          .map((entry) => {
            const datePart = entry.time ? `${entry.date} ${entry.time}` : entry.date;
            const privateTag = entry.protected ? ' <span class="lock">protected</span>' : "";
            const bodyText = enhancedTimelineBody(entry, collected);
            const body = bodyText
              ? `<div class="entry-body">${htmlEscape(bodyText).replace(/\n/g, "<br>")}</div>`
              : "";
            const tags = entry.tags?.length
              ? `<p class="tags">${entry.tags.map((t) => `<span class="tag">${htmlEscape(t)}</span>`).join("")}</p>`
              : "";
            return `<article class="timeline-entry">
              <header>
                <time>${htmlEscape(datePart)}</time>
                <span class="${kindBadgeClass(entry.kind)}">${timelineKindLabel(entry.kind)}</span>${privateTag}
              </header>
              <h3>${htmlEscape(entry.title)}</h3>
              ${body}
              ${tags}
            </article>`;
          })
          .join("\n");

  const evidenceRows =
    stream.length === 0
      ? ""
      : stream
          .map((item) => {
            const detail = evidenceDetailForStreamItem(data, collected, item);
            return `<tr><td>${htmlEscape(item.sortIso.slice(0, 10))}</td><td><span class="badge">${htmlEscape(item.kind)}</span></td><td>${htmlEscape(item.title)}</td><td>${htmlEscape(detail)}</td></tr>`;
          })
          .join("\n");

  const fileRows =
    attachments.length === 0
      ? ""
      : attachments
          .map(
            (att) =>
              `<tr><td>${htmlEscape(att.fileName)}</td><td>${htmlEscape(att.mimeType)}</td><td>${htmlEscape(attachmentSourceLabel(att, logs, inbox))}</td></tr>`
          )
          .join("\n");

  const entityList =
    relatedEntityIds.length === 0
      ? `<p class="muted">No related entities.</p>`
      : `<ul>${relatedEntityIds.map((id) => `<li>${htmlEscape(entityLabel(data, id))}</li>`).join("")}</ul>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${htmlEscape(branding.reportTitlePrefix)} — ${htmlEscape(scope.name)}</title>
  <style>${deliverReportStyles()}</style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <h1>${htmlEscape(scope.name)}</h1>
      <p>Activity Summary · ${htmlEscape(scopeLabel)} · ${htmlEscape(generatedAt.slice(0, 10))}</p>
    </header>

    <div class="stats">
      <div class="stat"><strong>${evidenceTotal}</strong><span>Evidence</span></div>
      <div class="stat"><strong>${inbox.length}</strong><span>Emails</span></div>
      <div class="stat"><strong>${logs.length}</strong><span>Journal</span></div>
      <div class="stat"><strong>${attachments.length}</strong><span>Files</span></div>
    </div>

    <section>
      <h2>Scope</h2>
      <dl class="meta">
        <dt>Subject</dt><dd>${htmlEscape(scope.name)}</dd>
        <dt>Type</dt><dd>${htmlEscape(scopeLabel)}</dd>
        <dt>Prepared by</dt><dd>${htmlEscape(branding.preparerName)}</dd>
        <dt>Generated</dt><dd>${htmlEscape(generatedAt)}</dd>
        <dt>Related entities</dt><dd>${relatedEntityIds.length}</dd>
      </dl>
      <p class="muted" style="margin-top:0.75rem;font-size:0.82rem;">Chronological index of recorded activity. For full artifacts, use the Evidence Dossier export.</p>
    </section>

    <section>
      <h2>Timeline</h2>
      ${timelineHtml}
    </section>

    <section>
      <h2>Evidence Index</h2>
      ${
        stream.length === 0
          ? `<p class="muted">No linked evidence.</p>`
          : `<table><thead><tr><th>Date</th><th>Kind</th><th>Title</th><th>Detail</th></tr></thead><tbody>${evidenceRows}</tbody></table>`
      }
    </section>

    <section>
      <h2>Files (metadata)</h2>
      ${
        attachments.length === 0
          ? `<p class="muted">No attachments in scope.</p>`
          : `<table><thead><tr><th>File</th><th>Type</th><th>Source</th></tr></thead><tbody>${fileRows}</tbody></table>`
      }
    </section>

    <section>
      <h2>Linked Entities</h2>
      ${entityList}
    </section>

    ${deliverFooterHtml(branding, generatedAt, "Activity Summary")}
  </div>
</body>
</html>`;
}

/** @deprecated Use buildActivitySummaryHtml */
export const buildQuickPackageHtml = buildActivitySummaryHtml;
