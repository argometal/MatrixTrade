import type { InboxItem, Log } from "../types";
import { buildEmailView } from "../email-view";

/** Safe path segment for ZIP / filesystem (ASCII-friendly). */
export function portableFileToken(value: string, fallback = "item"): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^\w\s.-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return cleaned || fallback;
}

function encodeHeaderValue(value: string): string {
  // Prefer plain ASCII; otherwise RFC 2047 UTF-8 base64.
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function formatRfc2822Date(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toUTCString().replace("GMT", "+0000");
  return d.toUTCString().replace("GMT", "+0000");
}

/**
 * Build a standard .eml (RFC 822) message openable in Outlook, Apple Mail, Thunderbird, Gmail import.
 * Prefer human clients over Argus-specific formats.
 */
export function buildPortableEml(item: InboxItem): { fileName: string; content: Buffer } {
  const view = buildEmailView(item);
  const day = view.receivedAt.slice(0, 10);
  const subjectToken = portableFileToken(view.subject || "email", "email");
  const fileName = `${day}-${subjectToken}-${item.id.slice(0, 8)}.eml`;

  const from = view.from || "unknown@localhost";
  const to = view.to || "undisclosed-recipients:;";
  const subject = view.subject || "(No subject)";
  const date = formatRfc2822Date(view.receivedAt);
  const text = view.textBody || "";
  const html = view.htmlBody?.trim();

  const headers = [
    `From: ${encodeHeaderValue(from)}`,
    `To: ${encodeHeaderValue(to)}`,
    `Subject: ${encodeHeaderValue(subject)}`,
    `Date: ${date}`,
    `Message-ID: <${item.id}@argus-export.local>`,
    `MIME-Version: 1.0`,
    `X-Argus-Inbox-Id: ${item.id}`,
  ];

  let body: string;
  if (html) {
    const boundary = `----=_Argus_${item.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body = [
      `This is a multi-part message in MIME format.`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      text,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      html,
      ``,
      `--${boundary}--`,
      ``,
    ].join("\r\n");
  } else {
    headers.push(`Content-Type: text/plain; charset=UTF-8`);
    headers.push(`Content-Transfer-Encoding: 8bit`);
    body = text;
  }

  const content = Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}`, "utf8");
  return { fileName, content };
}

/** Markdown note — opens in any editor / Obsidian / VS Code / GitHub. */
export function buildPortableNoteMarkdown(log: Log): { fileName: string; content: Buffer } {
  const day = (log.date || log.createdAt || "").slice(0, 10) || "undated";
  const titleToken = portableFileToken(log.title || "note", "note");
  const fileName = `${day}-${titleToken}-${log.id.slice(0, 8)}.md`;
  const tags =
    log.topics.length > 0 ? `\ntags: ${log.topics.map((t) => `#${t}`).join(" ")}\n` : "\n";
  const md = [
    `---`,
    `title: ${JSON.stringify(log.title || "Note")}`,
    `date: ${day}`,
    `argus_log_id: ${log.id}`,
    `kind: ${log.kind}`,
    `private: ${log.private ? "true" : "false"}`,
    `---`,
    tags,
    `# ${log.title || "Note"}`,
    ``,
    log.body?.trim() || "_No body._",
    ``,
  ].join("\n");
  return { fileName, content: Buffer.from(md, "utf8") };
}

export function buildPortableArchiveReadme(input: {
  scopeName: string;
  scopeType: string;
  generatedAt: string;
  emailCount: number;
  noteCount: number;
  fileCount: number;
}): string {
  const { scopeName, scopeType, generatedAt, emailCount, noteCount, fileCount } = input;
  return `ARGUS portable archive
======================

Scope: ${scopeName} (${scopeType})
Exported: ${generatedAt}

This ZIP is designed so a person can use it WITHOUT Argus.

How to read (no special software)
---------------------------------
1. Open report.html in Chrome, Safari, Edge, or Firefox.
2. Open emails/*.eml by double-click — Outlook, Apple Mail, Thunderbird, or Gmail import.
3. Open notes/*.md in any text editor, Obsidian, Notion import, or VS Code.
4. Open attachments/ with normal apps (PDF stays PDF, photos stay images).

Folder map
----------
report.html          Human story — start here
README.txt           This file
emails/              Standard email files (.eml)
notes/               Notes as Markdown (.md)
attachments/         Original files with readable names
files/               Same files keyed by id (links from report.html)
manifest.json        Inventory + checksums
argus/               Machine copy for re-import into Argus later
  evidence.json
  timeline.json

Counts in this package
----------------------
Emails: ${emailCount}
Notes: ${noteCount}
Attachments: ${fileCount}

If Argus is unavailable
-----------------------
Keep this ZIP. The content is standard web + email + Markdown + original binaries —
the same formats people already use every day.

Re-import into Argus
--------------------
argus/evidence.json + manifest.json preserve ids and links for a future import tool.
Do not delete this archive after soft-deleting live records until you have verified
you can open report.html and sample emails/files offline.
`;
}
