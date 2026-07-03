import { INBOX_SOURCE_LABELS, INBOX_STATUS_LABELS } from "@/lib/argus/labels";
import type { InboxSource, InboxStatus } from "@/lib/argus/types";
import type { AttachmentViewModel, EmailViewModel } from "@/lib/argus/email-view";
import { INBOX } from "@/lib/argus/ux-copy";
import { Card } from "./ui";
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
    <Card className="mb-4">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
          {INBOX_SOURCE_LABELS[source]}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusClass(status)}`}>
          {INBOX_STATUS_LABELS[status]}
        </span>
      </div>

      <h2 className="mt-3 text-lg font-semibold text-zinc-50">{view.subject || INBOX.noSubject}</h2>

      <dl className="mt-4 space-y-2 border-b border-zinc-800 pb-4 text-sm">
        <div className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1">
          <dt className="text-zinc-500">{INBOX.fromLabel}</dt>
          <dd className="break-all text-zinc-200">{view.from}</dd>
          {view.to && (
            <>
              <dt className="text-zinc-500">{INBOX.toLabel}</dt>
              <dd className="break-all text-zinc-200">{view.to}</dd>
            </>
          )}
          <dt className="text-zinc-500">{INBOX.receivedLabel}</dt>
          <dd className="text-zinc-200">{formatReceived(view.receivedAt)}</dd>
        </div>
      </dl>

      <section className="mt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{INBOX.messageBody}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{view.textBody}</p>
      </section>

      {view.htmlBody && (
        <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <summary className="cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {INBOX.htmlBody}
          </summary>
          <div className="border-t border-zinc-800 p-2">
            <iframe
              title="Email HTML body"
              srcDoc={view.htmlBody}
              sandbox=""
              className="min-h-[240px] w-full rounded-lg bg-white"
            />
          </div>
        </details>
      )}

      <InboxAttachmentList attachments={attachments} />

      {view.rawEmail && (
        <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <summary className="cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {INBOX.viewRaw}
          </summary>
          <pre className="max-h-72 overflow-auto border-t border-zinc-800 p-4 text-xs leading-relaxed text-zinc-400">
            {view.rawEmail}
          </pre>
        </details>
      )}
    </Card>
  );
}
