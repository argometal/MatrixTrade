import Link from "next/link";
import { notFound } from "next/navigation";
import { loadScopedScoutContext } from "@/lib/load-scoped-scout-context";
import {
  buildScopedAiUrls,
  validateScopedAiGrant,
} from "@/lib/scoped-ai-grants";
import { isBootstrapGrant } from "@/lib/scoped-ai-grant-types";

export default async function ScoutAccessPage({
  params,
}: {
  params: Promise<{ grantId: string }>;
}) {
  const { grantId } = await params;
  const validation = await validateScopedAiGrant(grantId, "read");
  if (!validation.ok) {
    if (validation.status === 404) notFound();
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-zinc-100">
        <h1 className="text-xl font-semibold">Scoped AI access</h1>
        <p className="mt-3 text-sm text-red-400">{validation.error}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Create a new link from Stock Profile or New stock case in MatrixTrade.
        </p>
      </main>
    );
  }

  const { grant } = validation;
  const bootstrap = isBootstrapGrant(grant);
  const { text, meta } = await loadScopedScoutContext(grant);
  const urls = buildScopedAiUrls(grant.id);
  const expires = new Date(grant.expiresAt).toLocaleString();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-zinc-100">
      <header className="border-b border-zinc-800 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
          {bootstrap ? "Bootstrap AI access · new stock case" : "Scoped AI access"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          {bootstrap ? "Create stock case" : `${grant.ticker} · ${grant.stockProfileId}`}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Grant {grant.id} · expires {expires}
        </p>
      </header>

      <section className="mt-6 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">How to use</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-400">
          <li>
            Fetch context from{" "}
            <code className="rounded bg-zinc-950 px-1.5 py-0.5 text-xs text-violet-300">
              {urls.contextUrl}
            </code>{" "}
            or paste the package below into your AI.
          </li>
          <li>
            {bootstrap ? (
              <>
                Discuss the setup in your AI chat. Return ONE{" "}
                <code className="text-violet-300">stock-case-create</code> block (Profile + optional
                initialScout).
              </>
            ) : (
              <>
                Return ONE block: <code className="text-violet-300">evidence-add</code>,{" "}
                <code className="text-violet-300">file-update</code>,{" "}
                <code className="text-violet-300">scout-assessment</code>, or{" "}
                <code className="text-violet-300">decision-update</code> for this ticker only.
              </>
            )}
          </li>
          <li>
            POST to{" "}
            <code className="rounded bg-zinc-950 px-1.5 py-0.5 text-xs text-violet-300">
              {urls.inboxUrl}
            </code>
          </li>
          <li>Apply in MatrixTrade Inbox — never auto-applied.</li>
        </ol>
      </section>

      {!bootstrap ? (
        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Thesis confidence</p>
            <p className="mt-1 text-lg font-semibold text-violet-300">
              {typeof meta.thesisConfidence === "number" ? meta.thesisConfidence : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Active evidence</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">
              {typeof meta.evidenceCount === "number" ? meta.evidenceCount : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Allowed types</p>
            <p className="mt-1 text-xs text-zinc-300">
              evidence-add · file-update · scout-assessment · decision-update
            </p>
          </div>
        </section>
      ) : (
        <section className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 text-sm text-emerald-200/90">
          Bootstrap grant — only <code className="text-emerald-300">stock-case-create</code> accepted.
          historicalAnalysis rows become Evidence; initialScout creates PLAN-xxx.
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-violet-500/30 bg-zinc-900/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">Context package</h2>
          {!bootstrap ? (
            <Link
              href={`/stock-theses/${grant.stockProfileId}`}
              className="text-xs text-violet-400 hover:text-violet-300"
            >
              Open Stock Profile →
            </Link>
          ) : (
            <Link href="/stock-theses/new" className="text-xs text-violet-400 hover:text-violet-300">
              New stock case →
            </Link>
          )}
        </div>
        <pre className="mt-3 max-h-[28rem] overflow-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-400">
          {text}
        </pre>
      </section>
    </main>
  );
}
