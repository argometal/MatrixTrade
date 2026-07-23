import Link from "next/link";

/** Placeholder only — Vault training layer is documented, not built. */
export default function ForgeVaultPlaceholderPage() {
  return (
    <section className="space-y-4" aria-labelledby="forge-vault-heading">
      <h2 id="forge-vault-heading" className="text-lg font-semibold text-zinc-100">
        Vault
      </h2>
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-4 text-sm leading-relaxed text-zinc-300">
        Vault is <strong className="font-semibold text-zinc-100">not implemented</strong> in this vertical slice.
        Per sealed contract, Vault <em>prepares formation</em> for a task or recipient — not Memory, not a knowledge dump,
        and not Chaos. No Training Pack generation, agents, or pipelines here.
      </p>
      <p className="text-xs text-zinc-500">
        Canonical doc: <code className="text-zinc-400">md/argusforge/vault-training-layer-contract.md</code>
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
