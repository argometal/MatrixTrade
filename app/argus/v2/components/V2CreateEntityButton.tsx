"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createEntityInlineAction } from "@/app/argus/actions";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import { ReferenceCreateModal } from "@/app/argus/components/ReferenceCreateModal";
import { LINK_HIERARCHY } from "@/lib/argus/ux-copy";
import type { ReferenceKind } from "@/lib/argus/reference-types";

export function V2CreateEntityButton({
  kind,
  label,
  className,
}: {
  kind: ReferenceKind;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const { openLinkModal } = useArgusAdd();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={pending} className={className}>
        {label}
      </button>
      <ReferenceCreateModal
        open={open}
        defaultKind={kind}
        allowedKinds={[kind]}
        onCancel={() => setOpen(false)}
        onSave={(data) => {
          startTransition(async () => {
            const created = await createEntityInlineAction(kind, data.name, data.notes);
            setOpen(false);
            openLinkModal({
              entityId: created.id,
              linkedEntityIds: [],
              title: "Link",
              subtitle: `Connect ${created.name} to related people, projects, topics, and events.`,
              showTags: false,
            });
            router.refresh();
          });
        }}
      />
    </>
  );
}

export function V2EntityLinkButton({
  entityId,
  linkedIds,
  label = "Link",
  className,
}: {
  entityId: string;
  linkedIds: string[];
  label?: string;
  className?: string;
}) {
  const { openLinkModal } = useArgusAdd();

  return (
    <button
      type="button"
      onClick={() =>
        openLinkModal({
          entityId,
          linkedEntityIds: linkedIds,
          title: "Link",
          subtitle: LINK_HIERARCHY.inboxLinkHint,
          showTags: false,
        })
      }
      className={className}
      title="Link to people, projects, topics, or events"
    >
      {label}
    </button>
  );
}

export function V2EntityCreateButton({
  label = "Create",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { openAddContext } = useArgusAdd();

  return (
    <button
      type="button"
      onClick={() => openAddContext()}
      className={className}
      title="Create a person, project, topic, event, or organization"
    >
      {label}
    </button>
  );
}
