import { LearningOverviewView } from "@/app/components/learning/LearningOverviewView";
import { buildLearningOverview } from "@/lib/learning-overview";
import { mxtPath } from "@/lib/mxt-paths";
import Link from "next/link";

export default async function LearningOverviewPage() {
  const data = await buildLearningOverview();

  return (
    <div>
      <div className="border-b border-zinc-900 px-4 pt-3 text-xs text-zinc-600">
        <Link href={mxtPath("/scout")} className="hover:text-zinc-400">
          Scout
        </Link>
        <span className="mx-1.5">→</span>
        <span className="text-zinc-500">Learning Overview</span>
      </div>
      <LearningOverviewView data={data} />
    </div>
  );
}
