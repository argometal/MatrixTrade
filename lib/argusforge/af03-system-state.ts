/**
 * ArgusForge shell navigation state.
 * Roles: Engine (logic) · Create (action) · View (Focus/Active/Archive) · Output (Vault/Alexandria).
 * localStorage persistence — not server session.
 */

export type ForgeSystemId = "argusforge" | "mta";
export type VaultModeId = "vault" | "alexandria";
export type OperationalViewId = "focus" | "active" | "archive";

/** Bottom-bar roles (Create is an action, not a route). */
export type ForgeBottomRole = "home" | "engine" | "create" | "view" | "output";

export const AF03_SYSTEM_KEY = "argusforge-selected-system-v1";
export const AF03_VAULT_MODE_KEY = "argusforge-vault-mode-v1";
export const AF03_VIEW_KEY = "argusforge-operational-view-v1";

export function readSelectedSystem(): ForgeSystemId {
  if (typeof window === "undefined") return "argusforge";
  try {
    const v = localStorage.getItem(AF03_SYSTEM_KEY);
    return v === "mta" ? "mta" : "argusforge";
  } catch {
    return "argusforge";
  }
}

export function writeSelectedSystem(system: ForgeSystemId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AF03_SYSTEM_KEY, system);
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

export function readOperationalView(): OperationalViewId {
  if (typeof window === "undefined") return "active";
  try {
    const v = localStorage.getItem(AF03_VIEW_KEY);
    if (v === "focus" || v === "archive" || v === "active") return v;
    return "active";
  } catch {
    return "active";
  }
}

export function writeOperationalView(view: OperationalViewId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AF03_VIEW_KEY, view);
  } catch {
    /* quota */
  }
}

/** Map pathname → which bottom role is “current” for highlight. */
export function roleFromPathname(pathname: string): ForgeBottomRole {
  if (pathname.startsWith("/forge/vault")) return "output";
  if (
    pathname.startsWith("/forge/focus") ||
    pathname.startsWith("/forge/active") ||
    pathname.startsWith("/forge/archive") ||
    pathname.startsWith("/forge/library") ||
    pathname.startsWith("/forge/deck") ||
    pathname.startsWith("/forge/chaos")
  ) {
    return "view";
  }
  if (pathname === "/forge" || pathname === "/forge/") return "home";
  return "home";
}

export function viewFromPathname(pathname: string): OperationalViewId | null {
  if (pathname.startsWith("/forge/focus")) return "focus";
  if (pathname.startsWith("/forge/archive")) return "archive";
  if (
    pathname.startsWith("/forge/active") ||
    pathname.startsWith("/forge/library") ||
    pathname.startsWith("/forge/deck")
  ) {
    return "active";
  }
  return null;
}

export function hrefForView(view: OperationalViewId): string {
  switch (view) {
    case "focus":
      return "/forge/focus";
    case "archive":
      return "/forge/archive";
    default:
      return "/forge/active";
  }
}

export function hrefForOutput(mode: VaultModeId): string {
  return "/forge/vault";
}

/** @deprecated Prefer roleFromPathname — kept for interim call sites. */
export type ForgeBottomSection = ForgeBottomRole | "library" | "vault" | "active" | "archive";

export function sectionFromPathname(pathname: string): ForgeBottomSection {
  return roleFromPathname(pathname);
}

export function hrefForSection(section: ForgeBottomSection): string {
  switch (section) {
    case "library":
    case "view":
      return "/forge/active";
    case "vault":
    case "output":
      return "/forge/vault";
    case "active":
      return "/forge/active";
    case "archive":
      return "/forge/archive";
    case "engine":
    case "create":
    case "home":
    default:
      return "/forge";
  }
}
