"use client";

import { buildEmailIframeDocument } from "@/lib/argus/email-html";

/** Outlook-style light reading pane for evidence email bodies. */
export function V2InboxEmailBody({
  textBody,
  htmlBody,
}: {
  textBody: string;
  htmlBody?: string;
}) {
  if (htmlBody) {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-black/5">
        <iframe
          sandbox=""
          title="Email content"
          srcDoc={buildEmailIframeDocument(htmlBody)}
          className="block w-full min-h-[320px] bg-white"
          style={{ colorScheme: "light" }}
        />
      </div>
    );
  }

  const empty = !textBody || textBody === "(No plain text body)";

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white px-5 py-5 shadow-sm ring-1 ring-black/5">
      {empty ? (
        <p className="text-sm text-zinc-500">No readable body — check attachments or raw metadata.</p>
      ) : (
        <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-zinc-900">{textBody}</p>
      )}
    </div>
  );
}
