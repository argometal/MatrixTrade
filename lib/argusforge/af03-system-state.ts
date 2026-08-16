/**
 * ArgusForge shell navigation state (system + vault mode).
 * localStorage persistence — not server session.
 */

export type ForgeSystemId = "argusforge" | "mta";
export type VaultModeId = "vault" | "alexandria";
export type ForgeBottomSection =
  | "home"
  | "library"
  | "vault"
  | "active"
  | "archive";

export const AF03_SYSTEM_KEY = "argusforge-selected-system-v1";
export const AF03_VAULT_MODE_KEY = "argusforge-vault-mode-v1";

/**
 * Trading deep-link “MTA” shell mode is disabled.
 * AF MTA (contract) = temporal/matrix engine — not MatrixTrade.
 * Always ArgusForge until a real AF-MTA surface exists.
 */
export function readSelectedSystem(): ForgeSystemId {
  if (typeof window === "undefined") return "argusforge";
  try {
    // Clear legacy trading-scope selection so it cannot reappear.
    if (localStorage.getItem(AF03_SYSTEM_KEY) === "mta") {
      localStorage.setItem(AF03_SYSTEM_KEY, "argusforge");
    }
  } catch {
    /* quota / private mode */
  }
  return "argusforge";
}

export function writeSelectedSystem(system: ForgeSystemId): void {
  if (typeof window === "undefined") return;
  try {
    // Refuse to persist trading-scope “mta”.
    localStorage.setItem(AF03_SYSTEM_KEY, system === "mta" ? "argusforge" : system);
  } catch {
    /* quota */
  }
}

export function readVaultMode(): VaultModeId {
  if (typeof window === "undefined") return "vault";
  try {
    const v = localStorage.getItem(AF03_VAULT_MODE_KEY);
    return v === "alexandria" ? "alexandria" : "vault";
  } catch {
    return "vault";
  }
}

export function writeVaultMode(mode: VaultModeId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AF03_VAULT_MODE_KEY, mode);
  } catch {
    /* quota */
  }
}

/** Map pathname → bottom section (Focus is not a nav section). */
export function sectionFromPathname(pathname: string): ForgeBottomSection {
  if (pathname.startsWith("/forge/archive")) return "archive";
  if (pathname.startsWith("/forge/active")) return "active";
  if (pathname.startsWith("/forge/library")) return "library";
  if (pathname.startsWith("/forge/vault")) return "vault";
  if (pathname === "/forge" || pathname === "/forge/") return "home";
  // Decks / chaos / task live under AF library family for highlight purposes
  if (pathname.startsWith("/forge/deck") || pathname.startsWith("/forge/chaos")) return "library";
  return "home";
}

export function hrefForSection(section: ForgeBottomSection): string {
  switch (section) {
    case "library":
      return "/forge/library";
    case "vault":
      return "/forge/vault";
    case "active":
      return "/forge/active";
    case "archive":
      return "/forge/archive";
    default:
      return "/forge";
  }
}
