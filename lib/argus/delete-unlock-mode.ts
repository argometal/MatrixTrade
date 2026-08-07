/**
 * Unlock mode for deleting linked evidence (inbox / chronicle notes).
 * Prefer authenticator when TOTP is configured; otherwise fall back to deletion PIN.
 * Pure — pass configured flags from the server (safe for client components).
 */
export function resolveLinkedDeleteUnlockMode(input: {
  linkedRequiresAuthenticator: boolean;
  totpConfigured: boolean;
  deleteCodeConfigured: boolean;
}): "none" | "pin" | "totp" {
  if (input.linkedRequiresAuthenticator && input.totpConfigured) return "totp";
  if (input.deleteCodeConfigured) return "pin";
  return "none";
}
