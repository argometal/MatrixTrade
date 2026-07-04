"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Entity, InboxItem, Log } from "@/lib/argus/types";
import { referenceDisplayLabel } from "@/lib/argus/reference-types";
import { INBOX_STATUS_LABELS } from "@/lib/argus/labels";
import { INBOX, TESTING } from "@/lib/argus/ux-copy";
import { CaptureSheet } from "./CaptureSheet";
import { ReferenceCreateModal } from "./ReferenceCreateModal";
import { ReferencePickerModal, type EntityPickerBuckets } from "./ReferencePickerModal";
import type { TagBuckets } from "./TagPickerModal";
import { Card } from "./ui";
import {
  archiveInboxAction,
  convertInboxAction,
  deleteInboxAction,
  linkInboxAction,
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

function actionButtonClass(variant: "primary" | "secondary" | "danger" = "secondary"): string {
  const base = "w-full rounded-xl py-3 text-sm font-medium";
  if (variant === "primary") return `${base} bg-teal-700 text-white hover:bg-teal-600`;
  if (variant === "danger") return `${base} border border-zinc-700 text-zinc-400 hover:bg-zinc-800`;
  return `${base} border border-zinc-700 text-zinc-200 hover:bg-zinc-800`;
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
  const linkFormRef = useRef<HTMLFormElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const [pendingNew, setPendingNew] = useState<{
    name: string;
    entityType: Entity["type"];
    notes: string;
  } | null>(null);
  const [showConvert, setShowConvert] = useState(false);

  const canTriage = item.status === "pending" || item.status === "linked";
  const statusLabel = INBOX_STATUS_LABELS[item.status];

  function submitLinkForm() {
    linkFormRef.current?.requestSubmit();
  }

  return (
    <>
      <Card className="mb-4">
        <p className="text-xs font-medium uppercase text-zinc-500">{INBOX.linkedTo}</p>
        {linkedEntities.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Not linked yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {linkedEntities.map((entity) => (
              <li key={entity.id}>
                <Link href={`/argus/network/${entity.id}`} className="text-sm text-teal-500 underline">
                  {referenceDisplayLabel(entity)}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {canTriage && (
          <p className="mt-4 text-xs text-zinc-500">
            {INBOX.actionsRemaining}: link a reference, convert to a record, or archive.
          </p>
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

      {canTriage && (
        <>
          <Card className="mb-4">
            <p className="mb-3 text-xs font-medium uppercase text-zinc-500">{INBOX.actions}</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setLinkIds([]);
                  setPendingNew(null);
                  setPickerOpen(true);
                }}
                className={actionButtonClass()}
              >
                {INBOX.linkReference}
              </button>
              <button type="button" onClick={() => setCreateOpen(true)} className={actionButtonClass()}>
                {INBOX.createReference}
              </button>
              <button
                type="button"
                onClick={() => setShowConvert((v) => !v)}
                className={actionButtonClass("primary")}
              >
                {INBOX.convertRecord}
              </button>
              <form action={archiveInboxAction}>
                <input type="hidden" name="inboxId" value={item.id} />
                <button type="submit" className={actionButtonClass("danger")}>
                  {INBOX.archive}
                </button>
              </form>
            </div>
          </Card>

          <form ref={linkFormRef} action={linkInboxAction} className="hidden">
            <input type="hidden" name="inboxId" value={item.id} />
            {linkIds.map((id) => (
              <input key={id} type="hidden" name="entityIds" value={id} />
            ))}
            {pendingNew && (
              <>
                <input type="hidden" name="newEntityName" value={pendingNew.name} />
                <input type="hidden" name="newEntityType" value={pendingNew.entityType} />
                <input type="hidden" name="newEntityNotes" value={pendingNew.notes} />
              </>
            )}
          </form>

          <ReferencePickerModal
            open={pickerOpen}
            buckets={buckets}
            selectedIds={linkIds}
            onChange={setLinkIds}
            onClose={() => setPickerOpen(false)}
            onConfirm={() => {
              if (linkIds.length > 0 || pendingNew) submitLinkForm();
            }}
            pendingNewName={pendingNew?.name}
            onPendingNew={(data) => {
              if (data) {
                setPendingNew(data);
                setPickerOpen(false);
                setTimeout(() => submitLinkForm(), 0);
              } else {
                setPendingNew(null);
              }
            }}
          />

          <ReferenceCreateModal
            open={createOpen}
            onCancel={() => setCreateOpen(false)}
            onSave={(data) => {
              setPendingNew(data);
              setCreateOpen(false);
              setTimeout(() => submitLinkForm(), 0);
            }}
          />

          {showConvert && (
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
          )}
        </>
      )}

      <ArgusDeleteForm
        action={deleteInboxAction}
        confirmMessage={TESTING.deleteInboxConfirm}
        label={TESTING.deleteInbox}
        className="mb-4"
      >
        <input type="hidden" name="inboxId" value={item.id} />
      </ArgusDeleteForm>

      <p className="text-center text-xs text-zinc-600">
        Status: {statusLabel}
        {item.attachmentIds.length > 0 ? ` · ${item.attachmentIds.length} attachment(s)` : ""}
      </p>
    </>
  );
}
