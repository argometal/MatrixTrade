"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Entity, InboxItem } from "@/lib/argus/types";
import { INBOX_STATUS_LABELS } from "@/lib/argus/labels";
import { entityDetailHref, referenceDisplayLabel } from "@/lib/argus/reference-types";
import {
  attachmentDownloadUrl,
  type AttachmentViewModel,
  type EmailViewModel,
} from "@/lib/argus/email-view";
import { HOME_INBOX_ACTIONS, INBOX, TESTING } from "@/lib/argus/ux-copy";
import { archiveInboxAction, convertInboxAction, deleteInboxAction, linkInboxAction, type CreatedEntityResult } from "@/app/argus/actions";
import { ArgusDeleteForm } from "./ArgusDeleteForm";
import { CaptureSheet } from "./CaptureSheet";
import { HomeExpandableCard } from "./HomeExpandableCard";
import { InboxAttachmentList } from "./InboxAttachmentList";
import { ReferencePickerModal, type EntityPickerBuckets } from "./ReferencePickerModal";
import type { TagBuckets } from "./TagPickerModal";

function formatReceived(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionButtonClass(compact = false): string {
  const base = compact
    ? "rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
    : "w-full rounded-xl border border-zinc-700 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800";
  return base;
}

export function HomeInboxCard({
  item,
  view,
  attachments,
  linkedEntities,
  buckets,
  tagBuckets,
  expanded,
  onToggle,
}: {
  item: InboxItem;
  view: EmailViewModel;
  attachments: AttachmentViewModel[];
  linkedEntities: Entity[];
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  expanded: boolean;
  onToggle: () => void;
}) {
  const linkFormRef = useRef<HTMLFormElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const [showConvert, setShowConvert] = useState(false);

  const canTriage = item.status === "pending" || item.status === "linked";
  const preview = view.textBody.replace(/\s+/g, " ").trim().slice(0, 120);

  function submitLinkForm() {
    linkFormRef.current?.requestSubmit();
  }

  function openLinkPicker() {
    setLinkIds([]);
    setPickerOpen(true);
  }

  async function linkCreatedEntity(entity: CreatedEntityResult): Promise<false> {
    const formData = new FormData();
    formData.set("inboxId", item.id);
    formData.set("entityIds", entity.id);
    formData.set("returnTo", "journal");
    await linkInboxAction(formData);
    return false;
  }

  const primaryAttachment = attachments[0];

  return (
    <>
      <HomeExpandableCard
        expanded={expanded}
        onToggle={onToggle}
        collapsed={
          <div>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">Email</p>
              <span className="text-[11px] text-zinc-600">{INBOX_STATUS_LABELS[item.status]}</span>
            </div>
            <p className="mt-2 text-[15px] font-medium text-zinc-100">{view.subject || INBOX.noSubject}</p>
            <dl className="mt-2 space-y-1 text-[13px]">
              <div className="flex gap-2">
                <dt className="text-zinc-600">{INBOX.fromLabel}</dt>
                <dd className="min-w-0 truncate text-zinc-300">{view.from}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-zinc-600">{INBOX.receivedLabel}</dt>
                <dd className="text-zinc-400">{formatReceived(view.receivedAt)}</dd>
              </div>
            </dl>
            {preview ? <p className="mt-2 line-clamp-2 text-[13px] text-zinc-500">{preview}</p> : null}
          </div>
        }
      >
        <dl className="space-y-2 text-sm">
          <div className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1">
            <dt className="text-zinc-500">{INBOX.fromLabel}</dt>
            <dd className="break-all text-zinc-200">{view.from}</dd>
            {view.to ? (
              <>
                <dt className="text-zinc-500">{INBOX.toLabel}</dt>
                <dd className="break-all text-zinc-200">{view.to}</dd>
              </>
            ) : null}
            <dt className="text-zinc-500">{INBOX.receivedLabel}</dt>
            <dd className="text-zinc-200">{formatReceived(view.receivedAt)}</dd>
          </div>
        </dl>

        <section className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{INBOX.messageBody}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{view.textBody}</p>
        </section>

        <InboxAttachmentList attachments={attachments} />

        {linkedEntities.length > 0 ? (
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <p className="text-xs font-medium uppercase text-zinc-500">{INBOX.linkedTo}</p>
            <ul className="mt-2 space-y-1">
              {linkedEntities.map((entity) => (
                <li key={entity.id}>
                  <Link href={entityDetailHref(entity)} className="text-sm text-teal-500 hover:text-teal-400">
                    {referenceDisplayLabel(entity)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="mb-3 text-xs font-medium uppercase text-zinc-500">{INBOX.actions}</p>
          <div className="flex flex-wrap gap-2">
            {canTriage ? (
              <>
                <button type="button" onClick={openLinkPicker} className={actionButtonClass(true)}>
                  {INBOX.linkReference}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConvert(true)}
                  className={actionButtonClass(true)}
                >
                  {INBOX.convertRecord}
                </button>
              </>
            ) : null}
            {primaryAttachment ? (
              <Link href={attachmentDownloadUrl(primaryAttachment.id)} className={actionButtonClass(true)}>
                {HOME_INBOX_ACTIONS.downloadOriginal}
              </Link>
            ) : null}
            <Link href={`/argus/inbox/${item.id}`} className={actionButtonClass(true)}>
              {HOME_INBOX_ACTIONS.openFullViewer}
            </Link>
            <ArgusDeleteForm
              action={deleteInboxAction}
              confirmMessage={TESTING.deleteInboxConfirm}
              label={TESTING.deleteInbox}
              className="inline"
            >
              <input type="hidden" name="inboxId" value={item.id} />
              <input type="hidden" name="returnTo" value="journal" />
            </ArgusDeleteForm>
          </div>
        </div>

        {canTriage && showConvert ? (
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <CaptureSheet
              open
              action={convertInboxAction}
              buckets={buckets}
              tagBuckets={tagBuckets}
              mode="embedded"
              onClose={() => setShowConvert(false)}
              initial={{
                title: view.subject || view.textBody.slice(0, 120),
                body: view.textBody,
                inboxId: item.id,
                entityIds: item.linkedEntityIds ?? [],
              }}
            />
          </div>
        ) : null}
      </HomeExpandableCard>

      {canTriage ? (
        <>
          <form ref={linkFormRef} action={linkInboxAction} className="hidden">
            <input type="hidden" name="inboxId" value={item.id} />
            <input type="hidden" name="returnTo" value="journal" />
            {linkIds.map((id) => (
              <input key={id} type="hidden" name="entityIds" value={id} />
            ))}
          </form>

          <ReferencePickerModal
            open={pickerOpen}
            buckets={buckets}
            selectedIds={linkIds}
            onChange={setLinkIds}
            onClose={() => setPickerOpen(false)}
            onConfirm={() => {
              if (linkIds.length > 0) submitLinkForm();
            }}
            onEntityCreated={linkCreatedEntity}
            createButtonLabel={INBOX.createReference}
          />

          <form action={archiveInboxAction} className="hidden" aria-hidden>
            <input type="hidden" name="inboxId" value={item.id} />
          </form>
        </>
      ) : null}
    </>
  );
}
