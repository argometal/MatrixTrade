import { hasArgusDeleteAuthUnlock, hasArgusDeleteUnlock } from "@/lib/auth/cookies";
import { argusDeleteCodeConfigured } from "@/lib/auth/passwords";
import { argusTotpConfigured } from "@/lib/auth/totp";
import {
  deleteAuthConfigured,
  entityDeleteRequiresAuthenticator,
  linkedEntityIdsRequireAuthenticator,
} from "@/lib/argus/delete-link-check";
import type { Entity } from "@/lib/argus/types";

export {
  deleteAuthConfigured,
  entityDeleteRequiresAuthenticator,
  linkedEntityIdsRequireAuthenticator,
} from "@/lib/argus/delete-link-check";
export { resolveLinkedDeleteUnlockMode } from "@/lib/argus/delete-unlock-mode";

export type DeleteGateError = "delete_code_locked" | "delete_auth_locked" | "totp_not_configured";

/** Returns whether delete is allowed for the current unlock cookies. */
export async function assertDeleteAllowed(
  entities: Entity[],
  linkedEntityIds: string[] | undefined
): Promise<{ ok: true } | { error: DeleteGateError }> {
  if (!deleteAuthConfigured()) return { ok: true };

  const pinConfigured = argusDeleteCodeConfigured();
  const totpConfigured = argusTotpConfigured();
  const pinUnlocked = pinConfigured && (await hasArgusDeleteUnlock());
  const authUnlocked = totpConfigured && (await hasArgusDeleteAuthUnlock());

  const needsAuthenticator = linkedEntityIdsRequireAuthenticator(entities, linkedEntityIds);

  // Linked evidence (topic/event/org): PIN or authenticator unlock both suffice.
  if (needsAuthenticator) {
    if (pinUnlocked || authUnlocked) return { ok: true };
    if (pinConfigured) return { error: "delete_code_locked" };
    if (totpConfigured) return { error: "delete_auth_locked" };
    return { ok: true };
  }

  if (pinConfigured && !pinUnlocked) {
    return { error: "delete_code_locked" };
  }
  return { ok: true };
}

/** Gate soft-delete for projects, organizations, topics, and events. */
export async function assertEntityDeleteAllowed(
  entity: Entity
): Promise<{ ok: true } | { error: DeleteGateError }> {
  if (!deleteAuthConfigured()) return { ok: true };

  if (entityDeleteRequiresAuthenticator(entity)) {
    if (!argusTotpConfigured()) return { error: "totp_not_configured" };
    if (!(await hasArgusDeleteAuthUnlock())) return { error: "delete_auth_locked" };
    return { ok: true };
  }

  if (argusDeleteCodeConfigured() && !(await hasArgusDeleteUnlock())) {
    return { error: "delete_code_locked" };
  }
  return { ok: true };
}
