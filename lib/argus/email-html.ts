/** Minimal prep for sandboxed HTML evidence display (not a full sanitizer). */

export function stripDangerousEmailHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

export function buildEmailIframeDocument(html: string): string {
  const body = stripDangerousEmailHtml(html);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank" rel="noopener noreferrer"><style>
body{margin:0;padding:20px 24px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:15px;line-height:1.65;color:#18181b;background:#fff;word-wrap:break-word;overflow-wrap:anywhere}
img{max-width:100%;height:auto}
a{color:#5b21b6}
blockquote{margin:0.75em 0;padding-left:1em;border-left:3px solid #e4e4e7;color:#52525b}
pre{white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px;overflow-x:auto}
table{max-width:100%;border-collapse:collapse}
td,th{border:1px solid #e4e4e7;padding:6px 8px}
</style></head><body>${body}</body></html>`;
}
