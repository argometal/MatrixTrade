import { MxtHelpShell } from "@/app/components/preview/MxtHelpShell";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";

/**
 * MXT Help index — Argus System → Help pattern, reusing PAGE_HELP content.
 * Contextual ? Help remains on individual pages via PageHelpPanel.
 */
export default function MxtHelpPage() {
  return (
    <PageHelpPanel pageId="insights" trigger="icon">
      <MxtHelpShell />
    </PageHelpPanel>
  );
}
