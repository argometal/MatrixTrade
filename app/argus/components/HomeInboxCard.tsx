"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { Entity, InboxItem } from "@/lib/argus/types";
import { INBOX_STATUS_LABELS } from "@/lib/argus/labels";
import { entityDetailHref, referenceDisplayLabel } from "@/lib/argus/reference-types";
import {
  attachmentDownloadUrl,
  type AttachmentViewModel,
  type EmailViewModel,
} from "@/lib/argus/email-view";
import { HOME_INBOX_ACTIONS, INBOX, TESTING } from "@/lib/argus/ux-copy";
import { allowedCreateKinds, filterEntityPickerBuckets } from "@/lib/argus/link-hierarchy";
import { archiveInboxAction, convertInboxAction, deleteInboxAction, linkInboxAction, setInboxPrivateAction, type CreatedEntityResult } from "@/app/argus/actions";
import { ArgusDeleteForm } from "./ArgusDeleteForm";
import { CaptureSheet } from "./CaptureSheet";
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

function primaryActionClass(): string {
  return "rounded-lg bg-teal-700/90 px-3 py-2 text-xs font-medium text-white hover:bg-teal-600";
}

export function HomeInboxCard({
  item,
  view,
  attachments,
  linkedEntities,
  buckets,
  tagBuckets,
}: {
  item: InboxItem;
  view: EmailViewModel;
  attachments: AttachmentViewModel[];
  linkedEntities: Entity[];
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
}) {
  const linkFormRef = useRef<HTMLFormElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const [showConvert, setShowConvert] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const canTriage = item.status === "pending" || item.status === "linked";
  const preview = view.textBody.replace(/\s+/g, " ").trim().slice(0, 120);
  const primaryAttachment = attachments[0];
  const inboxBuckets = useMemo(() => filterEntityPickerBuckets(buckets, "inbox"), [buckets]);
  const inboxCreateKinds = allowedCreateKinds("inbox");

  function submitLinkForm() {
    linkFormRef.current?.requestSubmit();
  }

  function openLinkPicker() {
    setLinkIds(item.linkedEntityIds ?? []);
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

  const cardPreview = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">Email</p>
        <span className="text-[11px] text-zinc-600">{INBOX_STATUS_LABELS[item.status]}</span>
        {item.private ? (
          <span className="rounded-full bg-violet-600/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
            Protected
          </span>
        ) : null}
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
      {!emailOpen && preview ? (
        <p className="mt-2 line-clamp-2 text-[13px] text-zinc-500">{preview}</p>
      ) : null}

      {linkedEntities.length > 0 ? (
        <div className="mt-3 border-t border-zinc-800/80 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">{INBOX.linkedTo}</p>
          <ul className="mt-1.5 space-y-1">
            {linkedEntities.map((entity) => (
              <li key={entity.id}>
                <Link
                  href={entityDetailHref(entity)}
                  onClick={(event) => event.stopPropagation()}
                  className="text-[13px] text-teal-500 hover:text-teal-400"
                >
                  {referenceDisplayLabel(entity)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!emailOpen ? (
        <p className="mt-3 text-[11px] text-zinc-600">{INBOX.tapToRead}</p>
      ) : null}
    </>
  );

  const actionBar = canTriage ? (
    <div className="border-b border-zinc-800/80 px-4 py-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{INBOX.actions}</p>
      <p className="mb-3 text-[12px] text-zinc-500">{INBOX.multiLinkHint}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={openLinkPicker} className={primaryActionClass()}>
          {INBOX.linkReference}
        </button>
        <button
          type="button"
          onClick={() => setShowConvert((open) => !open)}
          className={actionButtonClass(true)}
        >
          {INBOX.convertRecord}
        </button>
        {primaryAttachment ? (
          <Link href={attachmentDownloadUrl(primaryAttachment.id)} className={actionButtonClass(true)}>
            {HOME_INBOX_ACTIONS.downloadOriginal}
          </Link>
        ) : null}
        <Link href={`/argus/inbox/${item.id}`} className={actionButtonClass(true)}>
          {HOME_INBOX_ACTIONS.openFullViewer}
        </Link>
        {canTriage ? (
          <form action={setInboxPrivateAction} className="inline">
            <input type="hidden" name="inboxId" value={item.id} />
            <input type="hidden" name="returnTo" value="journal" />
            <input type="hidden" name="private" value={item.private ? "false" : "true"} />
            <button type="submit" className={actionButtonClass(true)}>
              {item.private ? INBOX.unprotectEmail : INBOX.protectEmail}
            </button>
          </form>
        ) : null}
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
  ) : null;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30">
        {actionBar}

        {canTriage ? (
          <>
            <button
              type="button"
              onClick={() => setEmailOpen((open) => !open)}
              aria-expanded={emailOpen}
              className="w-full px-4 py-3 text-left transition hover:bg-zinc-800/40"
            >
              {cardPreview}
            </button>
            {emailOpen ? (
              <div className="border-t border-zinc-800/80 px-4 pb-4">
                <section className="mt-3">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{INBOX.messageBody}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{view.textBody}</p>
                </section>
                <InboxAttachmentList attachments={attachments} />
              </div>
            ) : null}
          </>
        ) : (
          <Link href={`/argus/inbox/${item.id}`} className="block px-4 py-3 transition hover:bg-zinc-800/30">
            {cardPreview}
          </Link>
        )}

        {canTriage && showConvert ? (
          <div className="border-t border-zinc-800/80 px-4 py-4">
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
      </div>

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
            buckets={inboxBuckets}
            selectedIds={linkIds}
            onChange={setLinkIds}
            onClose={() => setPickerOpen(false)}
            onConfirm={() => {
              if (linkIds.length > 0) submitLinkForm();
            }}
            onEntityCreated={linkCreatedEntity}
            allowedCreateKinds={inboxCreateKinds}
            listMode="all"
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
