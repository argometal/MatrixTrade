"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createEntityInlineAction } from "@/app/argus/actions";
import { ReferenceCreateModal } from "@/app/argus/components/ReferenceCreateModal";
import {
  createInputToReferenceKind,
  entityNotesForDisplay,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import type { EntityType } from "@/lib/argus/types";
import { formatArgusError } from "@/lib/argus/persistence/errors";

function postCreateHref(pathname: string, kind: ReferenceKind, entityId: string): string {
  if (!pathname.startsWith("/argus/v2")) return `/argus/network/${entityId}`;
  switch (kind) {
    case "organization":
      return `/argus/v2/organizations/${entityId}`;
    case "project":
      return `/argus/v2/projects/${entityId}`;
    case "topic":
      return `/argus/v2/browse/topics?selected=${entityId}`;
    case "event":
      return `/argus/v2/browse/events?selected=${entityId}`;
    default:
      return `/argus/network/${entityId}`;
  }
}

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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(data: { name: string; entityType: EntityType; notes: string }) {
    setError(null);
    startTransition(async () => {
      try {
        const resolvedKind = createInputToReferenceKind(data.entityType, data.notes);
        const entity = await createEntityInlineAction(
          resolvedKind,
          data.name,
          entityNotesForDisplay(data.notes)
        );
        setOpen(false);
        router.push(postCreateHref(pathname, resolvedKind, entity.id));
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <ReferenceCreateModal
        open={open}
        defaultKind={kind}
        allowedKinds={[kind]}
        onCancel={() => {
          if (!isPending) setOpen(false);
        }}
        onSave={handleSave}
        saveLabel={isPending ? "Saving…" : undefined}
        error={error ?? undefined}
      />
    </>
  );
}
