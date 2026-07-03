/**
 * Simulates Cloudflare Email Worker MIME parse → POST intake (same path as deployed Worker).
 * Usage: npx tsx tools/simulate-email-worker-intake.ts [intakeUrl]
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import PostalMime from "postal-mime";

const intakeUrl =
  process.argv[2] ?? "https://investigated-used-develops-sight.trycloudflare.com/api/argus/email-inbox";

function loadInboxToken(): string {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const line = raw.split("\n").find((l) => l.startsWith("ARGUS_INBOX_TOKEN="));
  if (!line) throw new Error("ARGUS_INBOX_TOKEN missing");
  return line.slice("ARGUS_INBOX_TOKEN=".length).trim();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function main(): Promise<void> {
  const eml = readFileSync(resolve(process.cwd(), "argus-email-bridge/sample-test.eml"));
  const parsed = await new PostalMime().parse(eml);

  const attachments = (parsed.attachments ?? []).map((att, index) => {
    let content: Uint8Array;
    if (att.content instanceof Uint8Array) {
      content = att.content;
    } else if (typeof att.content === "string") {
      content = new TextEncoder().encode(att.content);
    } else if (att.content instanceof ArrayBuffer) {
      content = new Uint8Array(att.content);
    } else {
      content = new Uint8Array(0);
    }
    return {
      filename: att.filename ?? att.mimeType ?? `attachment-${index + 1}`,
      contentType: att.mimeType ?? "application/octet-stream",
      size: content.byteLength,
      contentBase64: bytesToBase64(content),
    };
  });

  const payload = {
    from: typeof parsed.from === "object" && parsed.from ? parsed.from.address : "tester@example.com",
    to: parsed.to?.[0] && typeof parsed.to[0] === "object" ? parsed.to[0].address : "argus@intake.test",
    subject: parsed.subject ?? "Worker E2E test",
    text: parsed.text ?? "",
    html: parsed.html ?? undefined,
    receivedAt: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
    attachments,
  };

  console.log(`POST ${intakeUrl}`);
  console.log(`Attachments: ${attachments.length}`);

  const res = await fetch(intakeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loadInboxToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
