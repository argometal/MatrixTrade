import { buildStockCaseBootPackage, STOCK_CASE_BOOT_REQUEST } from "./stock-case-boot";
import { buildScopedAiUrls } from "./scoped-ai-grants";
import type { ScopedAiGrant } from "./scoped-ai-grant-types";

export async function loadBootstrapCreateContext(grant: ScopedAiGrant): Promise<{
  text: string;
  meta: Record<string, unknown>;
}> {
  const urls = buildScopedAiUrls(grant.id);
  const text = buildStockCaseBootPackage();

  return {
    text: `${text}\n\n=== SCOPED BOOT GRANT ===\nGrant: ${grant.id}\nExpires: ${grant.expiresAt}\nInbox URL: ${urls.inboxUrl}\n`,
    meta: {
      grantId: grant.id,
      kind: "bootstrap",
      expiresAt: grant.expiresAt,
      allowedProposalTypes: ["stock-case-create"],
      inboxUrl: urls.inboxUrl,
      contextUrl: urls.contextUrl,
      humanPageUrl: urls.humanPageUrl,
      request: STOCK_CASE_BOOT_REQUEST,
    },
  };
}
