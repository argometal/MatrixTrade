"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import type { Entity, InboxItem, Log } from "@/lib/argus/types";
import { referenceDisplayLabel, entityDetailHref } from "@/lib/argus/reference-types";
import { INBOX_STATUS_LABELS } from "@/lib/argus/labels";
import { INBOX, TESTING } from "@/lib/argus/ux-copy";
import { filterEntityPickerBuckets } from "@/lib/argus/link-hierarchy";
import { CaptureSheet } from "./CaptureSheet";
import type { EntityPickerBuckets } from "./ReferencePickerModal";
import type { TagBuckets } from "./TagPickerModal";
import { Card } from "./ui";
import {
  archiveInboxAction,
  convertInboxAction,
  deleteInboxAction,
  linkInboxAction,
  setInboxPrivateAction,
  type CreatedEntityResult,
} from "@/app/argus/actions";
import { ArgusDeleteForm } from "./ArgusDeleteForm";

interface InboxTriagePanelProps {
  item: InboxItem;
  linkedEntities: Entity[];
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  convertedLog?: Log;
  defaultTitle: string;
  defaultBody: string;
}

function compactActionClass(primary = false): string {
  return primary
    ? "rounded-lg bg-teal-700/90 px-3 py-2 text-xs font-medium text-white hover:bg-teal-600"
    : "rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800";
}

export function InboxTriagePanel({
  item,
  linkedEntities,
  buckets,
  tagBuckets,
  convertedLog,
  defaultTitle,
  defaultBody,
}: InboxTriagePanelProps) {
  const { openLinkModal } = useArgusAdd();
  const [showConvert, setShowConvert] = useState(false);

  const canTriage = item.status === "pending" || item.status === "linked";
  const statusLabel = INBOX_STATUS_LABELS[item.status];
  const inboxBuckets = useMemo(() => filterEntityPickerBuckets(buckets, "inbox"), [buckets]);

  async function persistLinks(ids: string[]) {
    const formData = new FormData();
    formData.set("inboxId", item.id);
    for (const id of ids) formData.append("entityIds", id);
    await linkInboxAction(formData);
  }

  async function linkCreatedEntity(entity: CreatedEntityResult): Promise<false> {
    await persistLinks([entity.id]);
    return false;
  }

  function openLinkPicker() {
    openLinkModal({
      title: "Link email",
      linkedEntityIds: item.linkedEntityIds ?? [],
      buckets: inboxBuckets,
      showTags: false,
      onConfirm: (result) => {
        if (result.entityIds.length > 0) void persistLinks(result.entityIds);
      },
      onEntityCreated: linkCreatedEntity,
    });
  }

  return (
    <>
      {canTriage ? (
        <>
          <Card className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{INBOX.actions}</p>
            <p className="mb-3 text-[12px] text-zinc-500">{INBOX.multiLinkHint}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={openLinkPicker} className={compactActionClass(true)}>
                {INBOX.linkReference}
              </button>
              <button
                type="button"
                onClick={() => setShowConvert((open) => !open)}
                className={compactActionClass()}
              >
                {INBOX.convertRecord}
              </button>
              <form action={setInboxPrivateAction} className="inline">
                <input type="hidden" name="inboxId" value={item.id} />
                <input type="hidden" name="private" value={item.private ? "false" : "true"} />
                <button type="submit" className={compactActionClass()}>
                  {item.private ? INBOX.unprotectEmail : INBOX.protectEmail}
                </button>
              </form>
              <form action={archiveInboxAction} className="inline">
                <input type="hidden" name="inboxId" value={item.id} />
                <button type="submit" className={compactActionClass()}>
                  {INBOX.archive}
                </button>
              </form>
              <ArgusDeleteForm
                action={deleteInboxAction}
                confirmMessage={TESTING.deleteInboxConfirm}
                label={TESTING.deleteInbox}
                className="inline"
              >
                <input type="hidden" name="inboxId" value={item.id} />
              </ArgusDeleteForm>
            </div>
          </Card>

          {showConvert ? (
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-zinc-200">{INBOX.convertHeading}</p>
              <p className="mb-3 text-xs text-zinc-500">{INBOX.convertHint}</p>
              <CaptureSheet
                open
                action={convertInboxAction}
                buckets={buckets}
                tagBuckets={tagBuckets}
                mode="embedded"
                onClose={() => setShowConvert(false)}
                initial={{
                  title: defaultTitle,
                  body: defaultBody,
                  inboxId: item.id,
                  entityIds: item.linkedEntityIds ?? [],
                }}
              />
            </div>
          ) : null}
        </>
      ) : null}

      <Card className="mb-4">
        <p className="text-xs font-medium uppercase text-zinc-500">{INBOX.linkedTo}</p>
        {linkedEntities.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Not linked yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {linkedEntities.map((entity) => (
              <li key={entity.id}>
                <Link href={entityDetailHref(entity)} className="text-sm text-teal-500 underline">
                  {referenceDisplayLabel(entity)}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!canTriage && item.status === "converted" && convertedLog && (
          <p className="mt-4 text-sm text-zinc-400">
            Converted to{" "}
            <Link href={`/argus/logs/${convertedLog.id}`} className="text-teal-500 underline">
              {convertedLog.title}
            </Link>
          </p>
        )}
        {!canTriage && item.status === "archived" && (
          <p className="mt-4 text-sm text-zinc-500">{INBOX.noActions}</p>
        )}
      </Card>

      {!canTriage ? (
        <ArgusDeleteForm
          action={deleteInboxAction}
          confirmMessage={TESTING.deleteInboxConfirm}
          label={TESTING.deleteInbox}
          className="mb-4"
        >
          <input type="hidden" name="inboxId" value={item.id} />
        </ArgusDeleteForm>
      ) : null}

      <p className="mb-4 text-center text-xs text-zinc-600">
        Status: {statusLabel}
        {item.attachmentIds.length > 0 ? ` · ${item.attachmentIds.length} attachment(s)` : ""}
      </p>
    </>
  );
}
