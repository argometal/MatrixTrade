import type { ArgusData, Attachment, InboxItem, Log } from "../../types";
import { buildEntityEvidenceStream } from "../../v2/evidence-stream";
import { buildTimelineFromLogsAndInbox } from "../../v2/timeline-builders";
import { evidenceRecordCount } from "../dedup";
import type { CollectedVaultEvidence, ExportScopeType } from "../types";

const SCOPE_LABELS: Record<ExportScopeType, string> = {
  person: "Person",
  project: "Project",
  organization: "Organization",
  topic: "Topic",
  event: "Event",
};

function htmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

export function buildQuickPackageHtml(input: {
  data: ArgusData;
  inboxItems: InboxItem[];
  collected: CollectedVaultEvidence;
  includePrivate: boolean;
  today: string;
  generatedAt: string;
}): string {
  const { data, inboxItems, collected, includePrivate, today, generatedAt } = input;
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
            const body = entry.body
              ? `<div class="entry-body">${htmlEscape(entry.body).replace(/\n/g, "<br>")}</div>`
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
          .map(
            (item) =>
              `<tr><td>${htmlEscape(item.sortIso.slice(0, 10))}</td><td><span class="badge">${htmlEscape(item.kind)}</span></td><td>${htmlEscape(item.title)}</td><td><code>${htmlEscape(item.href)}</code></td></tr>`
          )
          .join("\n");

  const fileRows =
    attachments.length === 0
      ? ""
      : attachments
          .map(
            (att) =>
              `<tr><td>${htmlEscape(att.fileName)}</td><td>${htmlEscape(att.mimeType)}</td><td>${htmlEscape(attachmentSourceLabel(att, logs, inbox))}</td><td><code>files/${htmlEscape(att.id)}</code></td></tr>`
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
  <title>ARGUS Evidence Package — ${htmlEscape(scope.name)}</title>
  <style>
    :root { color-scheme: light; --bg: #f8fafc; --card: #fff; --text: #0f172a; --muted: #64748b; --border: #e2e8f0; --accent: #5b21b6; --accent-soft: #ede9fe; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
    .wrap { max-width: 920px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
    header.hero { background: linear-gradient(135deg, #1e1b4b, #5b21b6); color: #fff; border-radius: 16px; padding: 1.75rem 1.5rem; margin-bottom: 1.5rem; }
    header.hero h1 { margin: 0 0 0.35rem; font-size: 1.5rem; }
    header.hero p { margin: 0; opacity: 0.85; font-size: 0.9rem; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
    .stat { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; text-align: center; }
    .stat strong { display: block; font-size: 1.35rem; }
    .stat span { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
    section { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 1.25rem 1.35rem; margin-bottom: 1rem; }
    section h2 { margin: 0 0 1rem; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1.5rem; font-size: 0.9rem; }
    .meta dt { color: var(--muted); margin: 0; }
    .meta dd { margin: 0 0 0.5rem; font-weight: 600; }
    .timeline-entry { border-left: 3px solid var(--accent-soft); padding: 0 0 1.25rem 1rem; margin-bottom: 0.5rem; }
    .timeline-entry header { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem; }
    .timeline-entry time { font-size: 0.8rem; color: var(--muted); }
    .timeline-entry h3 { margin: 0 0 0.35rem; font-size: 1rem; }
    .entry-body { font-size: 0.9rem; color: #334155; }
    .badge { display: inline-block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.15rem 0.45rem; border-radius: 999px; background: var(--accent-soft); color: var(--accent); }
    .badge-email { background: #dbeafe; color: #1d4ed8; }
    .badge-journal { background: #d1fae5; color: #047857; }
    .badge-meeting { background: #ffedd5; color: #c2410c; }
    .lock { font-size: 0.7rem; color: #b45309; }
    .tags { margin: 0.5rem 0 0; }
    .tag { display: inline-block; margin-right: 0.35rem; padding: 0.1rem 0.45rem; border-radius: 6px; background: #f1f5f9; font-size: 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { text-align: left; padding: 0.55rem 0.5rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { color: var(--muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
    code { font-size: 0.78rem; background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 4px; }
    .muted { color: var(--muted); font-size: 0.9rem; }
    footer { margin-top: 1.5rem; text-align: center; font-size: 0.75rem; color: var(--muted); }
    @media (max-width: 640px) { .stats { grid-template-columns: repeat(2, 1fr); } .meta { grid-template-columns: 1fr; } }
    @media print { body { background: #fff; } .wrap { padding: 0; } section, .stat { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <h1>${htmlEscape(scope.name)}</h1>
      <p>ARGUS Quick Evidence Package · ${htmlEscape(scopeLabel)} · ${htmlEscape(generatedAt.slice(0, 10))}</p>
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
        <dt>Entity</dt><dd>${htmlEscape(scope.name)}</dd>
        <dt>Type</dt><dd>${htmlEscape(scopeLabel)}</dd>
        <dt>Generated</dt><dd>${htmlEscape(generatedAt)}</dd>
        <dt>Related entities</dt><dd>${relatedEntityIds.length}</dd>
      </dl>
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
          : `<table><thead><tr><th>Date</th><th>Kind</th><th>Title</th><th>Reference</th></tr></thead><tbody>${evidenceRows}</tbody></table>`
      }
    </section>

    <section>
      <h2>Files (metadata)</h2>
      ${
        attachments.length === 0
          ? `<p class="muted">No attachments in scope.</p>`
          : `<table><thead><tr><th>File</th><th>Type</th><th>Source</th><th>Path</th></tr></thead><tbody>${fileRows}</tbody></table>`
      }
    </section>

    <section>
      <h2>Linked Entities</h2>
      ${entityList}
    </section>

    <footer>Generated by ARGUS · Quick Package · ${htmlEscape(generatedAt)}</footer>
  </div>
</body>
</html>`;
}
