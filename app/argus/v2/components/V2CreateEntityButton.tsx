"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
import { CreateAndLinkModal } from "@/app/argus/components/CreateAndLinkModal";
import type { CreatedEntityResult } from "@/app/argus/actions";
import type { ReferenceKind } from "@/lib/argus/reference-types";

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
  const { buckets } = useArgusAdd();
  const [open, setOpen] = useState(false);

  function handleCreated(entity: CreatedEntityResult) {
    router.push(postCreateHref(pathname, kind, entity.id));
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <CreateAndLinkModal
        open={open}
        onClose={() => setOpen(false)}
        buckets={buckets}
        mode="create"
        defaultKind={kind}
        allowedKinds={[kind]}
        linkSource="create"
        onCreated={handleCreated}
      />
    </>
  );
}

export function V2EntityLinkButton({
  entityId,
  linkedIds,
  label = "+ Link",
  className,
}: {
  entityId: string;
  linkedIds: string[];
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const { buckets } = useArgusAdd();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <CreateAndLinkModal
        open={open}
        onClose={() => {
          setOpen(false);
          router.refresh();
        }}
        buckets={buckets}
        mode="link"
        entityId={entityId}
        initialLinkedIds={linkedIds}
        linkSource="create"
        title="Link references"
      />
    </>
  );
}
