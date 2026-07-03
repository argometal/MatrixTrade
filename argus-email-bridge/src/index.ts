import PostalMime from "postal-mime";

export interface Env {
  ARGUS_INBOX_TOKEN: string;
  ARGUS_INTAKE_URL: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function addressToString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "address" in value) {
    return String((value as { address?: string }).address ?? "");
  }
  return undefined;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    if (!env.ARGUS_INBOX_TOKEN || !env.ARGUS_INTAKE_URL) {
      message.setReject("Worker misconfigured: missing ARGUS secrets");
      return;
    }

    try {
      const raw = new Uint8Array(await new Response(message.raw).arrayBuffer());
      const parsed = await new PostalMime().parse(raw);

      const attachments = (parsed.attachments ?? []).map((att, index) => {
        const content = att.content instanceof Uint8Array ? att.content : new Uint8Array(0);
        return {
          filename: att.filename ?? att.mimeType ?? `attachment-${index + 1}`,
          contentType: att.mimeType ?? "application/octet-stream",
          size: content.byteLength,
          contentBase64: bytesToBase64(content),
        };
      });

      const payload = {
        from: addressToString(parsed.from) ?? message.from,
        to: addressToString(parsed.to?.[0]) ?? message.to,
        subject: parsed.subject ?? undefined,
        text: parsed.text ?? "",
        html: parsed.html ?? undefined,
        receivedAt: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
        attachments,
      };

      const response = await fetch(env.ARGUS_INTAKE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.ARGUS_INBOX_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.text();
        message.setReject(`ARGUS intake HTTP ${response.status}: ${detail.slice(0, 200)}`);
      }
    } catch (err) {
      message.setReject(`Email bridge error: ${String(err).slice(0, 200)}`);
    }
  },
};
