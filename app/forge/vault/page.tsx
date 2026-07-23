"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  dismissVaultPrep,
  listVaultPreps,
  type Af03VaultPrep,
} from "@/lib/argusforge/af03-vault-prep-store";
import { Af03RepoDisclosure } from "../components/Af03RepoDisclosure";

/**
 * AF03 §12 — Vault preparation boundary UI.
 * Shows human-review queue only — no automation, no Memory dump, no Alexandria.
 */
export default function ForgeVaultPage() {
  const [preps, setPreps] = useState<Af03VaultPrep[]>([]);

  useEffect(() => {
    setPreps(listVaultPreps());
  }, []);

  const open = preps.filter((p) => p.status === "awaiting_review");
  const dismissed = preps.filter((p) => p.status === "dismissed");

  return (
    <div className="space-y-5">
      <Af03RepoDisclosure />

      <section className="space-y-2" aria-labelledby="forge-vault-heading">
        <h2 id="forge-vault-heading" className="text-xl font-bold text-zinc-50">
          Vault preparation
        </h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          Boundary only: selected Chaos content waits for <strong className="text-zinc-200">human review</strong>{" "}
          before anything could become training context. No automatic copy of all Chaos. No final Vault
          automation here. Source links back to Chaos are preserved.
        </p>
        <p className="text-xs text-zinc-600">
          Doc: <code className="text-zinc-500">md/argusforge/vault-training-layer-contract.md</code>
        </p>
      </section>

      <section aria-labelledby="vault-queue-heading" className="space-y-2">
        <h3 id="vault-queue-heading" className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Awaiting review ({open.length})
        </h3>
        {open.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Empty. From a Chaos Deck, select items and use <em>Prepare for Vault</em>.
          </p>
        ) : (
          <ul className="space-y-3">
            {open.map((p) => (
              <li key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-100">{p.deckTitle}</p>
                    <p className="text-xs text-zinc-500">
                      {p.itemIds.length} selected · review required ·{" "}
                      {new Date(p.createdAt).toLocaleString()}
                    </p>
                    {p.note ? <p className="mt-2 text-sm text-zinc-400">{p.note}</p> : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-600/90 px-2 py-0.5 text-[10px] font-bold text-white">
                    REVIEW
                  </span>
                </div>
                <ul className="mt-3 space-y-1 border-t border-zinc-800 pt-3 text-sm">
                  {p.sources.map((s) => (
                    <li key={s.itemId} className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-zinc-300">
                        {s.title}{" "}
                        <span className="text-[10px] uppercase text-zinc-600">{s.kind}</span>
                      </span>
                      <Link
                        href={s.chaosPath}
                        className="text-xs text-sky-400 underline underline-offset-2"
                      >
                        Chaos source
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/forge/deck/${p.deckId}`}
                    className="inline-flex min-h-10 items-center rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-200"
                  >
                    Open deck
                  </Link>
                  <button
                    type="button"
                    className="min-h-10 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-500"
                    onClick={() => setPreps(dismissVaultPrep(p.id))}
                  >
                    Dismiss (not authoritative)
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dismissed.length > 0 ? (
        <p className="text-xs text-zinc-600">{dismissed.length} dismissed package(s) kept locally.</p>
      ) : null}

      <Link
        href="/forge/active"
        className="inline-flex min-h-11 items-center text-sm text-zinc-400 underline underline-offset-2"
      >
        ← Repository (Active filter — interim DEBT-AF03-01)
      </Link>
    </div>
  );
}
