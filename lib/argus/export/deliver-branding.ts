/** Generic deliver branding — no product name in exported reports during testing. */

export type DeliverBranding = {
  preparerName: string;
  showWatermark: boolean;
  reportTitlePrefix: string;
};

/** Display name on "Delivered by …" — set ARGUS_DELIVER_PREPARER in env (default: devinit). */
export function getDeliverPreparerName(): string {
  const configured = process.env.ARGUS_DELIVER_PREPARER?.trim();
  return configured || "devinit";
}

/**
 * Watermark on exported HTML (product name / trial notice).
 * Testing phase: always off. Future: free tier on, premium can disable.
 */
export function shouldShowDeliverWatermark(): boolean {
  if (process.env.ARGUS_DELIVER_WATERMARK === "1") return true;
  // Future: return !session.user.isPremium
  return false;
}

export function resolveDeliverBranding(): DeliverBranding {
  return {
    preparerName: getDeliverPreparerName(),
    showWatermark: shouldShowDeliverWatermark(),
    reportTitlePrefix: "Evidence Report",
  };
}

export function deliverFilenamePrefix(kind: "activity" | "dossier" | "vault" | "pdf"): string {
  if (kind === "activity") return "activity-summary";
  if (kind === "dossier") return "evidence-dossier";
  if (kind === "pdf") return "pdf-deliver";
  return "evidence-vault";
}
