"use client";

import { V2EntityLifecycleActions } from "./V2EntityLifecycleActions";
import type { V2DeleteGateProps } from "@/lib/argus/v2/delete-gate-props";
import type { EntityLifecycleStatus } from "@/lib/argus/types";

type EntityKind = "project" | "organization" | "topic" | "event" | "person";

/** Shown on mobile detail only while private unlock session is active (same 1h cookie as top-bar lock). */
export function V2MobileUnlockedManageBar({
  visible,
  entityId,
  entityName,
  entityKind,
  lifecycleStatus,
  returnTo,
  hasPrivateEvidence,
  privateConfigured,
  privateUnlocked,
  showDelete,
  ...deleteGate
}: {
  visible: boolean;
  entityId: string;
  entityName: string;
  entityKind: EntityKind;
  lifecycleStatus?: EntityLifecycleStatus;
  returnTo: string;
  hasPrivateEvidence?: boolean;
  privateConfigured?: boolean;
  privateUnlocked?: boolean;
  showDelete?: boolean;
} & V2DeleteGateProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/90 bg-zinc-950/95 px-4 py-3 backdrop-blur lg:hidden">
      <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-600">
        Unlocked session — manage entity
      </p>
      <V2EntityLifecycleActions
        entityId={entityId}
        entityName={entityName}
        entityKind={entityKind}
        lifecycleStatus={lifecycleStatus}
        returnTo={returnTo}
        variant="inline"
        showDelete={showDelete}
        hasPrivateEvidence={hasPrivateEvidence}
        privateConfigured={privateConfigured}
        privateUnlocked={privateUnlocked}
        {...deleteGate}
      />
    </div>
  );
}
