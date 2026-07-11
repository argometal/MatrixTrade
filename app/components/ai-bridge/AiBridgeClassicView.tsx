import Link from "next/link";
import type { ImportAiBlockActionResult } from "@/app/actions";
import { AiBlockPanel } from "@/app/components/ai-workspace/AiBlockPanel";
import { SystemSection } from "@/app/components/system/SystemSection";

export function AiBridgeClassicView({
  snapshotText,
  pendingInboxCount,
  pendingInboxPreview,
  importAction,
  viewToggle,
}: {
  snapshotText: string;
  pendingInboxCount: number;
  pendingInboxPreview: Array<{ id: string; origin: string; summary: string }>;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
  viewToggle: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">AI Bridge</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Classic view — Copy Snapshot → describe what you want → paste response → Inbox → Apply.
          </p>
        </div>
        {viewToggle}
      </header>

      <SystemSection
        id="ai-bridge-handoff"
        title="Snapshot & import"
        description="Copy context to your AI, then import its proposal — never auto-applied."
      >
        <AiBlockPanel snapshotText={snapshotText} importAction={importAction} />
      </SystemSection>

      <SystemSection id="inbox" title="Inbox" description="Imported proposals wait here for human Apply.">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-zinc-700">
            {pendingInboxCount === 0 ? (
              "No pending proposals."
            ) : (
              <span className="font-medium">{pendingInboxCount} pending</span>
            )}
          </p>
          <Link
            href="/inbox"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Open Inbox
          </Link>
        </div>
        {pendingInboxPreview.length > 0 && (
          <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm">
            {pendingInboxPreview.map((item) => (
              <li key={`${item.origin}-${item.id}`} className="flex justify-between gap-3 px-4 py-2">
                <span>{item.summary}</span>
                <Link href={`/inbox/${item.id}?origin=${item.origin}`} className="underline">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SystemSection>

      <nav className="flex gap-4 text-sm">
        <Link href="/system" className="text-zinc-600 hover:underline">
          System (sync) →
        </Link>
        <Link href="/" className="text-zinc-600 hover:underline">
          Dashboard
        </Link>
      </nav>
    </div>
  );
}
