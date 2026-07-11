import type { InboxItem, Log } from "../../types";
import type { DeliverBranding } from "../deliver-branding";
import { parseStoredEmailPayload } from "../../email-view";

export function htmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function textSnippet(text: string, maxLen = 240): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function emailBodyText(item: InboxItem): string {
  const stored = parseStoredEmailPayload(item.rawEmail);
  const storedText = stored?.text?.trim();
  if (storedText) return storedText;
  if (item.rawText?.trim()) return item.rawText.trim();
  const storedHtml = stored?.html?.trim();
  if (storedHtml) return htmlToPlainText(storedHtml);
  return item.subject?.trim() || "";
}

export function emailSnippet(item: InboxItem, maxLen = 240): string {
  return textSnippet(emailBodyText(item), maxLen);
}

export function logSnippet(log: Log, maxLen = 240): string {
  const parts = [log.title, log.body].filter(Boolean).join(" — ");
  return textSnippet(parts, maxLen);
}

export function deliverReportStyles(): string {
  return `
    :root { color-scheme: light; --bg: #f8fafc; --card: #fff; --text: #0f172a; --muted: #64748b; --border: #e2e8f0; --accent: #334155; --accent-soft: #f1f5f9; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
    .wrap { max-width: 920px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
    header.hero { background: linear-gradient(135deg, #1e293b, #475569); color: #fff; border-radius: 16px; padding: 1.75rem 1.5rem; margin-bottom: 1.5rem; }
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
    .entry-body { font-size: 0.9rem; color: #334155; white-space: pre-wrap; }
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
    .muted { color: var(--muted); font-size: 0.9rem; }
    footer { margin-top: 1.5rem; text-align: center; font-size: 0.75rem; color: var(--muted); }
    .watermark { margin-top: 0.75rem; font-size: 0.65rem; opacity: 0.5; }
    .narrative-block { margin-bottom: 1.5rem; }
    .narrative-block h3 { margin: 0 0 0.75rem; font-size: 1.05rem; color: #0f172a; }
    .evidence-card { border: 1px solid var(--border); border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; }
    .evidence-card h4 { margin: 0 0 0.35rem; font-size: 0.95rem; }
    .evidence-card .meta-line { font-size: 0.78rem; color: var(--muted); margin-bottom: 0.5rem; }
    .email-from { font-size: 0.82rem; color: #475569; margin-bottom: 0.35rem; }
    @media (max-width: 640px) { .stats { grid-template-columns: repeat(2, 1fr); } .meta { grid-template-columns: 1fr; } }
    @media print { body { background: #fff; } .wrap { padding: 0; } section, .stat { break-inside: avoid; } }
  `;
}

export function deliverFooterHtml(branding: DeliverBranding, generatedAt: string, variant: string): string {
  const watermark = branding.showWatermark
    ? `<p class="watermark">Confidential work record · trial export</p>`
    : "";
  return `<footer>Delivered by ${htmlEscape(branding.preparerName)} · ${htmlEscape(variant)} · ${htmlEscape(generatedAt)}${watermark}</footer>`;
}
