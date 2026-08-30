/**
 * Re-export session API for layouts that import `@/lib/auth/require-session`.
 * F2 no-op removed — real Forge-origin auth (F3).
 */
export {
  FORGE_AUTH,
  clearForgeSession,
  forgeAuthRequired,
  hasForgeSession,
  requireForgeSession,
  safeForgeReturnPath,
  setForgeSession,
  verifyForgePassword,
} from "@/lib/auth/session";
