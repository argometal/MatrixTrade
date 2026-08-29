import Link from "next/link";

/** Placeholder only — Task / workflow subsystem is not implemented. */
export default function ForgeTaskPlaceholderPage() {
  return (
    <section className="space-y-4" aria-labelledby="forge-task-heading">
      <h2 id="forge-task-heading" className="text-lg font-semibold text-zinc-100">
        Task
      </h2>
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-sm leading-relaxed text-zinc-300">
        Task is <strong className="font-semibold text-zinc-100">not implemented</strong> in this vertical slice.
        Future direction (reserved): natural language → task → workflow → result. Chaos captures may later become
        Task inputs. No planner, workflow engine, or agents here.
      </p>
      <Link
        href="/forge/chaos"
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        Back to Chaos Inbox
      </Link>
    </section>
  );
}
