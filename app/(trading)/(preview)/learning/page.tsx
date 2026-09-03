import { redirect } from "next/navigation";
import { mxtPath } from "@/lib/mxt-paths";

/**
 * MXT 016-P09 — Learning Overview UI superseded by Insights → Pipeline.
 * Learning engine (buildCase / diagnoseCase / buildLearningOverview) preserved.
 */
export default function LearningOverviewPage() {
  redirect(`${mxtPath("/stats")}?tab=pipeline`);
}
