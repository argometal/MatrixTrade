import PDFDocument from "pdfkit";
import type { ArgusData, Attachment, InboxItem, Log } from "../../types";
import { buildTimelineFromLogsAndInbox } from "../../v2/timeline-builders";
import type { DeliverBranding } from "../deliver-branding";
import { evidenceRecordCount } from "../dedup";
import type { CollectedVaultEvidence, ExportScopeType } from "../types";
import { buildDossierNarrativeSections, type DossierNarrativeSection } from "./dossier-narrative";
import { emailBodyText } from "./deliver-html-shared";

const SCOPE_LABELS: Record<ExportScopeType, string> = {
  person: "Person",
  project: "Project",
  organization: "Organization",
  topic: "Topic",
  event: "Event",
};

const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 495;

function entityLabel(data: ArgusData, entityId: string): string {
  const entity = data.entities.find((e) => e.id === entityId && !e.deletedAt);
  if (!entity) return entityId;
  const kind = entity.type === "company" ? "Org" : entity.type === "other" ? "Ref" : entity.type;
  return `${entity.name} (${kind})`;
}

function attachmentSourceLabel(att: Attachment, logs: Log[], inbox: InboxItem[]): string {
  if (att.parentType === "journal") {
    const log = logs.find((l) => l.id === att.parentId);
    return log ? `record: ${log.title || log.id}` : "record";
  }
  const item = inbox.find((i) => i.id === att.parentId);
  return item ? `email: ${item.subject || item.id}` : "email";
}

function ensureSpace(doc: PDFKit.PDFDocument, needed = 72): void {
  if (doc.y + needed > doc.page.height - PAGE_MARGIN) {
    doc.addPage();
  }
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 48);
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#1e293b").text(title.toUpperCase());
  doc.moveDown(0.35);
  doc
    .strokeColor("#cbd5e1")
    .lineWidth(1)
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
    .stroke();
  doc.moveDown(0.5);
}

function subsectionHeading(doc: PDFKit.PDFDocument, title: string, subtitle?: string): void {
  ensureSpace(doc, 40);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text(title, { width: CONTENT_WIDTH });
  if (subtitle) {
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(subtitle, { width: CONTENT_WIDTH });
  }
  doc.moveDown(0.45);
}

function metaRow(doc: PDFKit.PDFDocument, label: string, value: string): void {
  ensureSpace(doc, 20);
  doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(label, { continued: true, width: 120 });
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(`  ${value}`, { width: CONTENT_WIDTH - 120 });
}

function writeWrapped(
  doc: PDFKit.PDFDocument,
  text: string,
  options?: { font?: string; size?: number; color?: string; indent?: number }
): void {
  const font = options?.font ?? "Helvetica";
  const size = options?.size ?? 10;
  const color = options?.color ?? "#334155";
  const indent = options?.indent ?? 0;
  doc.font(font).fontSize(size).fillColor(color);
  ensureSpace(doc, size * 2);
  doc.text(text, PAGE_MARGIN + indent, doc.y, { width: CONTENT_WIDTH - indent, lineGap: 2 });
}

function renderEmailBlock(doc: PDFKit.PDFDocument, item: InboxItem): void {
  const subject = item.subject?.trim() || "(No subject)";
  const from = item.from?.trim();
  const to = item.to?.trim();
  const body = emailBodyText(item);

  ensureSpace(doc, 100);
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0f172a").text(subject, { width: CONTENT_WIDTH });
  doc.font("Helvetica").fontSize(8.5).fillColor("#64748b");
  const meta = [item.receivedAt.slice(0, 10), "Email"];
  if (item.private) meta.push("protected");
  doc.text(meta.join(" · "));
  if (from) doc.text(`From: ${from}`);
  if (to) doc.text(`To: ${to}`);
  if (item.topics?.length) doc.text(`Tags: ${item.topics.join(", ")}`);
  doc.moveDown(0.35);

  if (body) {
    writeWrapped(doc, body, { size: 9.5, color: "#1e293b" });
  } else {
    writeWrapped(doc, "No body text stored.", { size: 9, color: "#64748b" });
  }
  doc.moveDown(0.75);
}

function renderLogBlock(doc: PDFKit.PDFDocument, log: Log): void {
  ensureSpace(doc, 80);
  const title = log.title?.trim() || "Record";
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0f172a").text(title, { width: CONTENT_WIDTH });
  doc.font("Helvetica").fontSize(8.5).fillColor("#64748b");
  const meta = [log.date, "Record"];
  if (log.private) meta.push("protected");
  doc.text(meta.join(" · "));
  doc.moveDown(0.35);

  if (log.body?.trim()) {
    writeWrapped(doc, log.body.trim(), { size: 9.5, color: "#1e293b" });
  }
  doc.moveDown(0.75);
}

function renderNarrativeSection(doc: PDFKit.PDFDocument, section: DossierNarrativeSection): void {
  const entries = buildTimelineFromLogsAndInbox(section.logs, section.inbox).reverse();
  if (entries.length === 0) return;

  const subtitle = section.subtitle ? `${section.subtitle}` : undefined;
  subsectionHeading(doc, section.title, subtitle);

  for (const entry of entries) {
    if (entry.kind === "email") {
      const item = section.inbox.find((e) => e.id === entry.id);
      if (item) renderEmailBlock(doc, item);
      continue;
    }
    const log = section.logs.find((l) => l.id === entry.id);
    if (log) renderLogBlock(doc, log);
  }
}

export async function buildPdfDeliver(input: {
  data: ArgusData;
  collected: CollectedVaultEvidence;
  generatedAt: string;
  branding: DeliverBranding;
}): Promise<Buffer> {
  const { data, collected, generatedAt, branding } = input;
  const { scope, logs, inbox, attachments, relatedEntityIds } = collected;
  const scopeLabel = SCOPE_LABELS[scope.type];
  const narrative = buildDossierNarrativeSections(data, collected);
  const evidenceTotal = evidenceRecordCount(logs, inbox);

  const dates = [
    ...logs.map((l) => l.date.slice(0, 10)),
    ...inbox.map((i) => i.receivedAt.slice(0, 10)),
  ].filter(Boolean);
  dates.sort();
  const dateRange =
    dates.length === 0 ? "—" : dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} → ${dates[dates.length - 1]}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(22).fillColor("#0f172a").text(scope.name, { width: CONTENT_WIDTH });
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(11).fillColor("#64748b").text(`PDF · ${scopeLabel} · ${generatedAt.slice(0, 10)}`);
    doc.moveDown(1.2);

    metaRow(doc, "Subject", scope.name);
    metaRow(doc, "Scope type", scopeLabel);
    metaRow(doc, "Prepared by", branding.preparerName);
    metaRow(doc, "Date range", dateRange);
    metaRow(doc, "Generated", generatedAt);
    doc.moveDown(0.8);
    writeWrapped(
      doc,
      `${evidenceTotal} evidence items · ${inbox.length} emails · ${logs.length} records · ${attachments.length} files`
    );
    writeWrapped(doc, "Full email bodies and record text included below.", { size: 9, color: "#64748b" });

    sectionHeading(doc, "Chronology by Event");
    if (narrative.eventSections.length === 0) {
      writeWrapped(doc, "No event anchors with linked evidence.", { color: "#64748b" });
    } else {
      for (const section of narrative.eventSections) {
        renderNarrativeSection(doc, section);
      }
    }

    sectionHeading(doc, "General Chronology");
    if (narrative.general.logs.length === 0 && narrative.general.inbox.length === 0) {
      writeWrapped(doc, "All evidence grouped under event anchors.", { color: "#64748b" });
    } else {
      renderNarrativeSection(doc, narrative.general);
    }

    sectionHeading(doc, "Files");
    if (attachments.length === 0) {
      writeWrapped(doc, "No attachments in scope.", { color: "#64748b" });
    } else {
      for (const att of attachments) {
        ensureSpace(doc, 36);
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text(att.fileName, { width: CONTENT_WIDTH });
        writeWrapped(
          doc,
          `${att.mimeType} · ${attachmentSourceLabel(att, logs, inbox)} · ${att.createdAt.slice(0, 10)}`,
          { size: 8.5, color: "#64748b" }
        );
        doc.moveDown(0.35);
      }
    }

    if (relatedEntityIds.length > 0) {
      sectionHeading(doc, "Related Entities");
      for (const id of relatedEntityIds) {
        writeWrapped(doc, `• ${entityLabel(data, id)}`, { size: 9.5 });
      }
    }

    if (collected.containsPrivate) {
      doc.moveDown(0.8);
      writeWrapped(doc, "This report may include protected records.", { size: 8.5, color: "#b45309" });
    }

    doc.moveDown(1);
    doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text(
      `Delivered by ${branding.preparerName} · PDF · ${generatedAt}`,
      { align: "center", width: CONTENT_WIDTH }
    );

    doc.end();
  });
}
