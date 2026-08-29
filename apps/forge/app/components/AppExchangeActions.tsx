"use client";

/**
 * F2 TRANSITIONAL ADAPTER — ecosystem shell stub.
 * Replaces AppExchangeActions / ForgePortalNav for compile + local smoke.
 * Full portal chrome extraction is F3. No cross-app imports.
 */
export function AppExchangeActions({
  className = "",
}: {
  app: "matrix" | "argus" | "forge";
  inboxCount?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-xs text-zinc-500 ${className}`}
      title="F2 shell stub — portal chrome in F3"
      aria-label="Systems menu (stub)"
    >
      A
    </div>
  );
}
