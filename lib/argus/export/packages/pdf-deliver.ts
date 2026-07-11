import PDFDocument from "pdfkit";
import type { ArgusData, Attachment, InboxItem, Log } from "../../types";
import { buildTimelineFromLogsAndInbox } from "../../v2/timeline-builders";
import type { DeliverBranding } from "../deliver-branding";
import { evidenceRecordCount } from "../dedup";
import type { CollectedVaultEvidence, ExportScopeType } from "../types";
import { emailSnippet, logSnippet, textSnippet } from "./deliver-html-shared";

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

function whoForEntry(
  data: ArgusData,
  entry: { id: string; kind: string },
  logs: Log[],
  inbox: InboxItem[]
): string | undefined {
  if (entry.kind === "email") {
    const item = inbox.find((e) => e.id === entry.id);
    return item?.from?.replace(/<.*>/, "").trim() || undefined;
  }
  const log = logs.find((l) => l.id === entry.id);
  if (!log) return undefined;
  const names = log.entityIds
    .map((id) => data.entities.find((e) => e.id === id && !e.deletedAt)?.name)
    .filter(Boolean);
  return names.length ? names.join(", ") : undefined;
}

function notesForEntry(
  entry: { id: string; kind: string; body?: string; title: string },
  logs: Log[],
  inbox: InboxItem[]
): string {
  if (entry.body?.trim()) return textSnippet(entry.body.trim(), 500);
  if (entry.kind === "email") {
    const item = inbox.find((e) => e.id === entry.id);
    return item ? emailSnippet(item, 500) : textSnippet(entry.title, 500);
  }
  const log = logs.find((l) => l.id === entry.id);
  return log ? logSnippet(log, 500) : textSnippet(entry.title, 500);
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

export async function buildPdfDeliver(input: {
  data: ArgusData;
  collected: CollectedVaultEvidence;
  generatedAt: string;
  branding: DeliverBranding;
}): Promise<Buffer> {
  const { data, collected, generatedAt, branding } = input;
  const { scope, logs, inbox, attachments, relatedEntityIds } = collected;
  const scopeLabel = SCOPE_LABELS[scope.type];
  const timeline = buildTimelineFromLogsAndInbox(logs, inbox).reverse();
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

    // Cover
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
      `${evidenceTotal} evidence items · ${inbox.length} emails · ${logs.length} journal entries · ${attachments.length} files`
    );

    // Timeline
    sectionHeading(doc, "Timeline");
    if (timeline.length === 0) {
      writeWrapped(doc, "No evidence in scope.", { color: "#64748b" });
    } else {
      for (const entry of timeline) {
        ensureSpace(doc, 90);
        const datePart = entry.time ? `${entry.date} ${entry.time}` : entry.date;
        const who = whoForEntry(data, entry, logs, inbox);
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(entry.title, { width: CONTENT_WIDTH });
        doc.font("Helvetica").fontSize(8.5).fillColor("#64748b");
        const metaParts = [datePart, timelineKindLabel(entry.kind)];
        if (who) metaParts.push(who);
        if (entry.protected) metaParts.push("protected");
        doc.text(metaParts.join(" · "));
        const notes = notesForEntry(entry, logs, inbox);
        if (notes) writeWrapped(doc, notes, { size: 9, color: "#475569" });
        if (entry.tags?.length) {
          writeWrapped(doc, `Tags: ${entry.tags.join(", ")}`, { size: 8.5, color: "#64748b" });
        }
        doc.moveDown(0.6);
      }
    }

    // Evidence items
    sectionHeading(doc, "Evidence Items");
    if (timeline.length === 0) {
      writeWrapped(doc, "No evidence in scope.", { color: "#64748b" });
    } else {
      for (const entry of timeline) {
        ensureSpace(doc, 70);
        const who = whoForEntry(data, entry, logs, inbox);
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text(entry.title, { width: CONTENT_WIDTH });
        const detailParts = [
          entry.time ? `${entry.date} ${entry.time}` : entry.date,
          timelineKindLabel(entry.kind),
        ];
        if (who) detailParts.push(`Who: ${who}`);
        if (entry.tags?.length) detailParts.push(`Tags: ${entry.tags.join(", ")}`);
        writeWrapped(doc, detailParts.join(" · "), { size: 8.5, color: "#64748b" });
        const notes = notesForEntry(entry, logs, inbox);
        if (notes) writeWrapped(doc, notes, { size: 9, color: "#334155", indent: 8 });
        doc.moveDown(0.45);
      }
    }

    // Attachment index
    sectionHeading(doc, "Attachment Index");
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

    // Related entities
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
