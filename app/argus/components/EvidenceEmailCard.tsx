"use client";

import Link from "next/link";
import { useState } from "react";
import type { InboxItem } from "@/lib/argus/types";
import { INBOX_STATUS_LABELS } from "@/lib/argus/labels";
import {
  attachmentDownloadUrl,
  type AttachmentViewModel,
  type EmailViewModel,
} from "@/lib/argus/email-view";
import { ENTITY_PAGE, HOME_INBOX_ACTIONS, INBOX } from "@/lib/argus/ux-copy";
import { InboxAttachmentList } from "./InboxAttachmentList";

function formatReceived(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status: InboxItem["status"]): string {
  if (status === "pending") return "bg-amber-600/20 text-amber-300";
  if (status === "linked") return "bg-teal-600/20 text-teal-300";
  if (status === "converted") return "bg-violet-600/20 text-violet-300";
  return "bg-zinc-800 text-zinc-500";
}

export function EvidenceEmailCard({
  item,
  view,
  attachments,
}: {
  item: InboxItem;
  view: EmailViewModel;
  attachments: AttachmentViewModel[];
}) {
  const [open, setOpen] = useState(false);
  const preview = view.textBody.replace(/\s+/g, " ").trim().slice(0, 160);

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-900/40">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-800/80 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Email</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusTone(item.status)}`}>
              {INBOX_STATUS_LABELS[item.status]}
            </span>
          </div>
          <h3 className="mt-1 text-[15px] font-semibold leading-snug text-zinc-50">
            {view.subject || INBOX.noSubject}
          </h3>
        </div>
        <Link
          href={`/argus/inbox/${item.id}`}
          className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800"
        >
          {HOME_INBOX_ACTIONS.openFullViewer}
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full px-4 py-3 text-left transition hover:bg-zinc-800/30"
      >
        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1 text-[13px]">
          <dt className="text-zinc-600">{INBOX.fromLabel}</dt>
          <dd className="break-all text-zinc-300">{view.from || "—"}</dd>
          <dt className="text-zinc-600">{INBOX.receivedLabel}</dt>
          <dd className="text-zinc-400">{formatReceived(view.receivedAt)}</dd>
        </dl>
        {!open && preview ? (
          <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-zinc-500">{preview}</p>
        ) : null}
        <p className="mt-2 text-[11px] text-teal-500/90">{open ? ENTITY_PAGE.collapseEmail : ENTITY_PAGE.expandEmail}</p>
      </button>

      {open ? (
        <div className="border-t border-zinc-800/80 px-4 pb-4">
          {view.to ? (
            <p className="mt-3 text-[13px] text-zinc-400">
              <span className="text-zinc-600">{INBOX.toLabel}: </span>
              {view.to}
            </p>
          ) : null}
          <section className="mt-4">
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{INBOX.messageBody}</h4>
            <div className="mt-2 max-h-[min(420px,50vh)] overflow-y-auto rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-100">{view.textBody}</p>
            </div>
          </section>
          {view.htmlBody ? (
            <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40">
              <summary className="cursor-pointer px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                {INBOX.htmlBody}
              </summary>
              <div className="border-t border-zinc-800 p-2">
                <iframe
                  title="Email HTML body"
                  srcDoc={view.htmlBody}
                  sandbox=""
                  className="min-h-[280px] w-full rounded-lg bg-white"
                />
              </div>
            </details>
          ) : null}
          <InboxAttachmentList attachments={attachments} />
        </div>
      ) : null}
    </article>
  );
}
