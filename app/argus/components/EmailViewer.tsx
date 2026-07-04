import { INBOX_SOURCE_LABELS, INBOX_STATUS_LABELS } from "@/lib/argus/labels";
import type { InboxSource, InboxStatus } from "@/lib/argus/types";
import type { AttachmentViewModel, EmailViewModel } from "@/lib/argus/email-view";
import { INBOX } from "@/lib/argus/ux-copy";
import { InboxAttachmentList } from "./InboxAttachmentList";

function statusClass(status: InboxStatus): string {
  if (status === "pending") return "bg-amber-600/20 text-amber-400";
  if (status === "linked") return "bg-teal-600/20 text-teal-400";
  if (status === "converted") return "bg-violet-600/20 text-violet-300";
  return "bg-zinc-800 text-zinc-500";
}

function formatReceived(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EmailViewer({
  view,
  attachments,
  status,
  source,
}: {
  view: EmailViewModel;
  attachments: AttachmentViewModel[];
  status: InboxStatus;
  source: InboxSource;
}) {
  return (
    <article className="mb-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
            {INBOX_SOURCE_LABELS[source]}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusClass(status)}`}>
            {INBOX_STATUS_LABELS[status]}
          </span>
        </div>

        <h2 className="mt-3 text-xl font-semibold leading-snug text-zinc-50">
          {view.subject || INBOX.noSubject}
        </h2>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[5.5rem_1fr]">
          <dt className="text-zinc-500">{INBOX.fromLabel}</dt>
          <dd className="break-all text-zinc-200">{view.from || "—"}</dd>
          {view.to ? (
            <>
              <dt className="text-zinc-500">{INBOX.toLabel}</dt>
              <dd className="break-all text-zinc-200">{view.to}</dd>
            </>
          ) : null}
          <dt className="text-zinc-500">{INBOX.receivedLabel}</dt>
          <dd className="text-zinc-200">{formatReceived(view.receivedAt)}</dd>
        </dl>
      </div>

      <div className="px-5 py-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{INBOX.messageBody}</h3>
        <div className="mt-3 max-h-[min(560px,65vh)] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-100">{view.textBody}</p>
        </div>
      </div>

      {view.htmlBody ? (
        <details className="border-t border-zinc-800">
          <summary className="cursor-pointer px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {INBOX.htmlBody}
          </summary>
          <div className="border-t border-zinc-800 p-3">
            <iframe
              title="Email HTML body"
              srcDoc={view.htmlBody}
              sandbox=""
              className="min-h-[320px] w-full rounded-lg bg-white"
            />
          </div>
        </details>
      ) : null}

      <div className="border-t border-zinc-800 px-5 py-4">
        <InboxAttachmentList attachments={attachments} />
      </div>

      {view.rawEmail ? (
        <details className="border-t border-zinc-800">
          <summary className="cursor-pointer px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {INBOX.viewRaw}
          </summary>
          <pre className="max-h-72 overflow-auto border-t border-zinc-800 p-4 text-xs leading-relaxed text-zinc-400">
            {view.rawEmail}
          </pre>
        </details>
      ) : null}
    </article>
  );
}
