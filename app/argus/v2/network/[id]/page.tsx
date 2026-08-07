import { redirect } from "next/navigation";
import {
  hasArgusDeleteAuthUnlock,
  hasArgusDeleteUnlock,
  hasArgusPrivateUnlock,
} from "@/lib/auth/cookies";
import { argusDeleteCodeConfigured } from "@/lib/auth/passwords";
import { argusTotpConfigured } from "@/lib/auth/totp";
import { deleteAuthConfigured } from "@/lib/argus/delete-link-check";
import { EmptyState } from "@/app/argus/components/ui";
import { buildEntityPickerBuckets } from "@/lib/argus/journal-helpers";
import { loadEnrichedEntityEvidence } from "@/lib/argus/entity-evidence";
import { referenceKindFromNotes } from "@/lib/argus/reference-types";
import { getEntity, getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { buildNetworkContactPageData } from "@/lib/argus/v2/network-contact-loaders";
import { buildNetworkContactPanelPackage } from "@/lib/argus/v2/network-snapshot-packages";
import { NetworkContactShell } from "../components/NetworkContactShell";

export default async function V2NetworkContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    delete_error?: string;
    delete_auth_error?: string;
    totp_required?: string;
    error?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [includePrivate, deleteUnlocked, deleteAuthUnlocked] = await Promise.all([
    hasArgusPrivateUnlock(),
    hasArgusDeleteUnlock(),
    hasArgusDeleteAuthUnlock(),
  ]);
  const entity = await getEntity(id);

  if (!entity) {
    return (
      <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="px-4 py-6 lg:px-8">
            <EmptyState message="Contact not found." />
          </div>
        </div>
      </div>
    );
  }

  if (entity.type === "project") {
    redirect(`/argus/v2/projects/${id}`);
  }

  if (entity.type === "company") {
    redirect(`/argus/v2/organizations/${id}`);
  }

  const kind = referenceKindFromNotes(entity.notes ?? "");
  if (kind === "event") {
    redirect(`/argus/v2/browse/events?selected=${id}`);
  }
  if (kind === "topic") {
    redirect(`/argus/v2/browse/topics?selected=${id}`);
  }

  const [data, inboxItems, evidence] = await Promise.all([
    readArgus(),
    getInboxItems(undefined, includePrivate),
    loadEnrichedEntityEvidence(id, includePrivate),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const page = buildNetworkContactPageData({
    data,
    entity,
    inboxItems,
    logs: evidence.logs,
    enrichedInbox: evidence.enrichedInbox,
    includePrivate,
    today,
  });
  const buckets = buildEntityPickerBuckets(data, includePrivate);
  const panelPackage = buildNetworkContactPanelPackage(page);

  return (
    <NetworkContactShell
      page={page}
      buckets={buckets}
      panelPackage={panelPackage}
      deleteLock={{
        deleteUnlocked,
        deleteAuthUnlocked,
        deleteCodeConfigured: argusDeleteCodeConfigured(),
        totpConfigured: argusTotpConfigured(),
        deleteAuthConfigured: deleteAuthConfigured(),
        deleteError: sp.delete_error === "1" || sp.error === "pin",
        deleteAuthError: sp.delete_auth_error === "1",
        totpRequired: sp.totp_required === "1",
      }}
    />
  );
}
