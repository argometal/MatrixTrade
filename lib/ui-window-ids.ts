/**
 * Stable UI window identifiers for human-in-the-loop development.
 * Shown as a small badge on every trading surface — not product copy.
 */

import { stripMxtPrefix } from "@/lib/mxt-paths";

export type UiWindowId =
  | "UI·dashboard"
  | "UI·scout"
  | "UI·capital-planner"
  | "UI·capital-settings"
  | "UI·trades"
  | "UI·trade-detail"
  | "UI·trade-review"
  | "UI·stock-file"
  | "UI·stock-file-new"
  | "UI·playbook"
  | "UI·history"
  | "UI·history-item"
  | "UI·insights"
  | "UI·stats"
  | "UI·journal"
  | "UI·mistakes"
  | "UI·review-queue"
  | "UI·system"
  | "UI·enter-trade"
  | "UI·exchange"
  | "UI·ai-workspace"
  | "UI·ai-bridge"
  | "UI·connect"
  | "UI·home";

export function resolveUiWindowId(pathname: string | null | undefined): UiWindowId | null {
  if (!pathname) return null;
  let path = (pathname.split("?")[0] || pathname).replace(/\/+$/, "") || "/";
  // Canonical /mxt/* (and temporary /mta/*) map to filesystem route window ids.
  path = stripMxtPrefix(path);

  if (path === "/") return "UI·home";

  if (/^\/trades\/[^/]+\/review$/.test(path)) return "UI·trade-review";
  if (path === "/trades/new") return "UI·enter-trade";
  if (/^\/trades\/[^/]+$/.test(path)) return "UI·trade-detail";
  if (path === "/trades" || path === "/trades-preview") return "UI·trades";

  if (path === "/planning/capital" || path.startsWith("/planning/capital/")) {
    return "UI·capital-planner";
  }
  if (path === "/settings/capital" || path.startsWith("/settings/capital/")) {
    return "UI·capital-settings";
  }
  if (path === "/settings/security" || path.startsWith("/settings/security/")) {
    return "UI·capital-settings";
  }
  if (path === "/planning") return "UI·scout";
  if (path === "/stock-theses/new") return "UI·stock-file-new";
  if (path.startsWith("/stock-theses/")) return "UI·stock-file";
  if (path === "/playbook") return "UI·playbook";

  if (path.startsWith("/inbox/")) return "UI·history-item";
  if (path === "/inbox") return "UI·history";

  if (path === "/home-preview") return "UI·dashboard";
  if (path === "/insights") return "UI·insights";
  if (path === "/stats") return "UI·stats";
  if (path === "/journal") return "UI·journal";
  if (path === "/mistakes") return "UI·mistakes";
  if (path === "/review") return "UI·review-queue";
  if (path === "/system") return "UI·system";
  if (path === "/exchange") return "UI·exchange";
  if (path === "/ai-workspace") return "UI·ai-workspace";
  if (path === "/ai-bridge") return "UI·ai-bridge";
  if (path === "/connect") return "UI·connect";

  return null;
}
