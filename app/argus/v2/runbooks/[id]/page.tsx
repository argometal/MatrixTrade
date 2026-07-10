import Link from "next/link";
import { getEntity, getRunbook, readArgus } from "@/lib/argus/server-storage";
import { runbookProgress } from "@/lib/argus/runbook-helpers";
import { V2BackLink, V2Badge } from "../../components/v2-ui";
import { V2RecordRecentEntity } from "../../components/V2RecordRecentEntity";
import { V2RunbookWorkPanel } from "../../components/V2RunbookWorkPanel";
import { EmptyState } from "@/app/argus/components/ui";

export default async function V2RunbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [runbook, data] = await Promise.all([getRunbook(id), readArgus()]);

  if (!runbook) {
    return (
      <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
        <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="px-4 py-6 lg:px-8">
            <V2BackLink href="/argus/v2/browse/projects">Back to Projects</V2BackLink>
            <EmptyState message="Runbook not found." />
          </div>
        </div>
      </div>
    );
  }

  const progress = runbookProgress(runbook.items);
  const linked = runbook.linkedEntityIds
    .map((entityId) => data.entities.find((entity) => entity.id === entityId && !entity.deletedAt))
    .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity));

  const backHref =
    linked.find((entity) => entity.type === "project")
      ? `/argus/v2/projects/${linked.find((entity) => entity.type === "project")!.id}`
      : linked.find((entity) => entity.type === "company")
        ? `/argus/v2/organizations/${linked.find((entity) => entity.type === "company")!.id}`
        : "/argus/v2/browse/projects";

  return (
    <div className="v2-page-shell flex h-full min-h-0 flex-col overflow-hidden">
      <V2RecordRecentEntity
        id={runbook.id}
        kind="runbook"
        label={runbook.title}
        href={`/argus/v2/runbooks/${runbook.id}`}
      />
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 py-6 lg:px-8">
      <div className="mb-5">
        <V2BackLink href={backHref}>Back</V2BackLink>
      </div>

      <header className="mb-6">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-500/15 text-xl ring-1 ring-lime-500/30">
            ☑
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{runbook.title}</h1>
              <V2Badge tone="green">Runbook</V2Badge>
              {progress.open === 0 && progress.total > 0 ? (
                <V2Badge tone="blue">Complete</V2Badge>
              ) : null}
            </div>
            {linked.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {linked.map((entity) => (
                  <Link
                    key={entity.id}
                    href={
                      entity.type === "project"
                        ? `/argus/v2/projects/${entity.id}`
                        : entity.type === "company"
                          ? `/argus/v2/organizations/${entity.id}`
                          : `/argus/v2/network/${entity.id}`
                    }
                  >
                    <V2Badge tone={entity.type === "project" ? "amber" : "orange"}>{entity.name}</V2Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No linked project or organization yet.</p>
            )}
          </div>
        </div>
      </header>

      <V2RunbookWorkPanel runbook={runbook} />
        </div>
      </div>
    </div>
  );
}
