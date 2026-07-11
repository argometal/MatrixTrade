import { hasArgusDeleteAuthUnlock, hasArgusDeleteUnlock } from "@/lib/auth/cookies";
import { argusDeleteCodeConfigured } from "@/lib/auth/passwords";
import { argusTotpConfigured } from "@/lib/auth/totp";
import { deleteAuthConfigured, entityDeleteRequiresAuthenticator } from "@/lib/argus/delete-link-check";
import type { Entity } from "@/lib/argus/types";

export type V2DeleteGateProps = {
  requiresAuthenticator: boolean;
  deleteUnlocked: boolean;
  deleteAuthUnlocked: boolean;
  deleteCodeConfigured: boolean;
  totpConfigured: boolean;
  deleteAuthConfigured: boolean;
  deleteError: boolean;
  deleteAuthError: boolean;
  totpRequired: boolean;
};

type DeleteSearchParams = {
  delete_error?: string;
  delete_auth_error?: string;
  totp_required?: string;
  error?: string;
};

export async function buildV2DeleteGateProps(
  entity: Entity,
  searchParams: DeleteSearchParams = {}
): Promise<V2DeleteGateProps> {
  const [deleteUnlocked, deleteAuthUnlocked] = await Promise.all([
    hasArgusDeleteUnlock(),
    hasArgusDeleteAuthUnlock(),
  ]);

  return {
    requiresAuthenticator: entityDeleteRequiresAuthenticator(entity),
    deleteUnlocked,
    deleteAuthUnlocked,
    deleteCodeConfigured: argusDeleteCodeConfigured(),
    totpConfigured: argusTotpConfigured(),
    deleteAuthConfigured: deleteAuthConfigured(),
    deleteError: searchParams.delete_error === "1" || searchParams.error === "pin",
    deleteAuthError: searchParams.delete_auth_error === "1",
    totpRequired: searchParams.totp_required === "1",
  };
}
