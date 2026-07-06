"use client";

import { useRouter } from "next/navigation";
import { useArgusAdd } from "@/app/argus/components/ArgusAddProvider";
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
  const { openCreateFlow } = useArgusAdd();

  return (
    <button
      type="button"
      onClick={() => openCreateFlow({ itemKind: kind, lockItemKind: true })}
      className={className}
    >
      {label}
    </button>
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
  const { openCreateFlow } = useArgusAdd();

  return (
    <button
      type="button"
      onClick={() =>
        openCreateFlow({
          mode: "link",
          entityId,
          linkedEntityIds: linkedIds,
          onSaved: () => router.refresh(),
        })
      }
      className={className}
    >
      {label}
    </button>
  );
}
