/**
 * Unlock mode for deleting linked evidence (inbox / chronicle notes).
 * Prefer deletion PIN when configured; authenticator only if PIN is unavailable.
 * Pure — pass configured flags from the server (safe for client components).
 */
export function resolveLinkedDeleteUnlockMode(input: {
  linkedRequiresAuthenticator: boolean;
  totpConfigured: boolean;
  deleteCodeConfigured: boolean;
}): "none" | "pin" | "totp" {
  if (input.deleteCodeConfigured) return "pin";
  if (input.linkedRequiresAuthenticator && input.totpConfigured) return "totp";
  return "none";
}
