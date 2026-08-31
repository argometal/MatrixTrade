/**
 * Prompt #12D — local read-only gate for Supabase-backed MXT stores.
 * Prevents accidental production mutation when TRADES_STORE=supabase locally.
 */

export function isMxtReadOnlyMode(): boolean {
  const flag = process.env.MXT_READ_ONLY?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  const store = process.env.TRADES_STORE?.trim().toLowerCase();
  return store === "supabase-readonly";
}

export function assertMxtPersistenceWriteAllowed(operation: string): void {
  if (!isMxtReadOnlyMode()) return;
  throw new Error(
    `[MXT_READ_ONLY] Blocked persistence write: ${operation}. ` +
      "Local #12D uses read-only Supabase — production data must not be modified."
  );
}
