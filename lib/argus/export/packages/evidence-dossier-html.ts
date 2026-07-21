import type { ArgusData, Attachment, InboxItem, Log } from "../../types";
import { buildTimelineFromLogsAndInbox } from "../../v2/timeline-builders";
import type { DeliverBranding } from "../deliver-branding";
import { evidenceRecordCount } from "../dedup";
import type { CollectedVaultEvidence, ExportScopeType } from "../types";
import { buildDossierNarrativeSections } from "./dossier-narrative";
import {
  deliverFooterHtml,
  deliverReportStyles,
  emailBodyText,
  htmlEscape,
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

function renderLogCard(log: Log): string {
  const privateTag = log.private ? ' <span class="lock">protected</span>' : "";
  const body = log.body?.trim()
    ? `<div class="entry-body">${htmlEscape(log.body).replace(/\n/g, "<br>")}</div>`
    : "";
  return `<div class="evidence-card">
    <h4>${htmlEscape(log.title || "Journal entry")}${privateTag}</h4>
    <p class="meta-line">${htmlEscape(log.date)} · Journal</p>
    ${body}
  </div>`;
}

function renderEmailCard(item: InboxItem, zipMode: boolean): string {
  const privateTag = item.private ? ' <span class="lock">protected</span>' : "";
  const subject = item.subject?.trim() || "(No subject)";
  const from = item.from?.trim();
  const body = emailBodyText(item);
  const bodyHtml = body
    ? `<div class="entry-body">${htmlEscape(body).replace(/\n/g, "<br>")}</div>`
    : `<p class="muted">No body text stored.</p>`;
  const attachments =
    item.attachmentIds?.length && zipMode
      ? `<p class="meta-line">Attachments: ${item.attachmentIds.map((id) => `<a href="files/${htmlEscape(id)}">file</a>`).join(", ")}</p>`
      : "";
  return `<div class="evidence-card">
    <h4>${htmlEscape(subject)}${privateTag}</h4>
    <p class="meta-line">${htmlEscape(item.receivedAt.slice(0, 10))} · Email</p>
    ${from ? `<p class="email-from">From: ${htmlEscape(from)}</p>` : ""}
    ${bodyHtml}
    ${attachments}
  </div>`;
}

function renderNarrativeSection(
  section: { title: string; subtitle?: string; logs: Log[]; inbox: InboxItem[] },
  zipMode: boolean
): string {
  const entries = buildTimelineFromLogsAndInbox(section.logs, section.inbox).reverse();
  if (entries.length === 0) return "";

  const cards: string[] = [];
  for (const entry of entries) {
    if (entry.kind === "email") {
      const item = section.inbox.find((e) => e.id === entry.id);
      if (item) cards.push(renderEmailCard(item, zipMode));
    } else {
      const log = section.logs.find((l) => l.id === entry.id);
      if (log) cards.push(renderLogCard(log));
    }
  }

  const subtitle = section.subtitle ? ` · ${htmlEscape(section.subtitle)}` : "";
  return `<div class="narrative-block">
    <h3>${htmlEscape(section.title)}${subtitle}</h3>
    ${cards.join("\n")}
  </div>`;
}

function renderFilesAppendix(attachments: Attachment[], zipMode: boolean): string {
  if (attachments.length === 0) return `<p class="muted">No files in scope.</p>`;
  const rows = attachments
    .map((att) => {
      const path = zipMode ? `files/${att.id}` : att.fileName;
      const link = zipMode ? `<a href="${htmlEscape(path)}">${htmlEscape(att.fileName)}</a>` : htmlEscape(att.fileName);
      return `<tr><td>${link}</td><td>${htmlEscape(att.mimeType)}</td><td>${htmlEscape(att.fileName)}</td></tr>`;
    })
    .join("\n");
  return `<table><thead><tr><th>File</th><th>Type</th><th>Name</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function buildEvidenceDossierHtml(input: {
  data: ArgusData;
  collected: CollectedVaultEvidence;
  generatedAt: string;
  branding: DeliverBranding;
  /** When true, file links point to files/ in bundled ZIP. */
  zipMode?: boolean;
}): string {
  const { data, collected, generatedAt, branding, zipMode = false } = input;
  const { scope, logs, inbox, attachments, relatedEntityIds } = collected;
  const scopeLabel = SCOPE_LABELS[scope.type];
  const narrative = buildDossierNarrativeSections(data, collected);

  const eventHtml = narrative.eventSections.map((s) => renderNarrativeSection(s, zipMode)).join("\n");
  const generalHtml =
    narrative.general.logs.length > 0 || narrative.general.inbox.length > 0
      ? renderNarrativeSection(narrative.general, zipMode)
      : `<p class="muted">All evidence grouped under event anchors.</p>`;

  const entityList =
    relatedEntityIds.length === 0
      ? `<p class="muted">No related entities.</p>`
      : `<ul>${relatedEntityIds.map((id) => `<li>${htmlEscape(entityLabel(data, id))}</li>`).join("")}</ul>`;

  const dateRange = (() => {
    const dates = [
      ...logs.map((l) => l.date.slice(0, 10)),
      ...inbox.map((i) => i.receivedAt.slice(0, 10)),
    ].filter(Boolean);
    if (dates.length === 0) return "—";
    dates.sort();
    return dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} → ${dates[dates.length - 1]}`;
  })();

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
      <p>Portable Archive · ${htmlEscape(scopeLabel)} · ${htmlEscape(generatedAt.slice(0, 10))}</p>
    </header>

    <div class="stats">
      <div class="stat"><strong>${evidenceRecordCount(logs, inbox)}</strong><span>Evidence</span></div>
      <div class="stat"><strong>${inbox.length}</strong><span>Emails</span></div>
      <div class="stat"><strong>${logs.length}</strong><span>Journal</span></div>
      <div class="stat"><strong>${attachments.length}</strong><span>Files</span></div>
    </div>

    <section>
      <h2>Cover</h2>
      <dl class="meta">
        <dt>Subject</dt><dd>${htmlEscape(scope.name)}</dd>
        <dt>Type</dt><dd>${htmlEscape(scopeLabel)}</dd>
        <dt>Prepared by</dt><dd>${htmlEscape(branding.preparerName)}</dd>
        <dt>Date range</dt><dd>${htmlEscape(dateRange)}</dd>
        <dt>Generated</dt><dd>${htmlEscape(generatedAt)}</dd>
      </dl>
      <p class="muted" style="margin-top:0.75rem;font-size:0.82rem;">Full evidence assembly — email bodies, journal text, and file references${zipMode ? " bundled in this package" : ""}.</p>
    </section>

    <section>
      <h2>Chronology by Event</h2>
      ${eventHtml || `<p class="muted">No event anchors with linked evidence.</p>`}
    </section>

    <section>
      <h2>General Chronology</h2>
      ${generalHtml}
    </section>

    <section>
      <h2>People &amp; Context</h2>
      ${entityList}
    </section>

    <section>
      <h2>Appendix — Files</h2>
      ${renderFilesAppendix(attachments, zipMode)}
      ${collected.containsPrivate ? `<p class="muted" style="margin-top:0.75rem;">This package may include protected records.</p>` : ""}
    </section>

    ${deliverFooterHtml(branding, generatedAt, "Portable Archive")}
  </div>
</body>
</html>`;
}
