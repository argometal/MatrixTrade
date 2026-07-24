"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  dismissVaultPrep,
  listVaultPreps,
  type Af03VaultPrep,
} from "@/lib/argusforge/af03-vault-prep-store";
import { Af03RepoDisclosure } from "../components/Af03RepoDisclosure";
import { useForgeSystem } from "../components/ForgeSystemProvider";

/**
 * Vault destination with internal Vault | Alexandria selector.
 * Alexandria remains FROZEN — boundary disclosure only, no Library implementation.
 */
export default function ForgeVaultPage() {
  const { vaultMode, setVaultMode, ready } = useForgeSystem();
  const [preps, setPreps] = useState<Af03VaultPrep[]>([]);

  useEffect(() => {
    setPreps(listVaultPreps());
  }, []);

  const open = preps.filter((p) => p.status === "awaiting_review");
  const dismissed = preps.filter((p) => p.status === "dismissed");

  if (!ready) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div className="space-y-5">
      <Af03RepoDisclosure />

      <div
        className="inline-flex w-full rounded-lg border border-zinc-800 bg-zinc-950 p-0.5"
        role="group"
        aria-label="Knowledge family"
      >
        <button
          type="button"
          aria-pressed={vaultMode === "vault"}
          onClick={() => setVaultMode("vault")}
          className={`min-h-10 flex-1 rounded-md text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
            vaultMode === "vault" ? "bg-zinc-800 text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Vault
        </button>
        <button
          type="button"
          aria-pressed={vaultMode === "alexandria"}
          onClick={() => setVaultMode("alexandria")}
          className={`min-h-10 flex-1 rounded-md text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
            vaultMode === "alexandria"
              ? "bg-zinc-800 text-zinc-50"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Alexandria
        </button>
      </div>

      {vaultMode === "vault" ? (
        <section className="space-y-4" aria-labelledby="forge-vault-heading">
          <header className="space-y-1">
            <h2 id="forge-vault-heading" className="text-xl font-bold text-zinc-50">
              Vault preparation
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Raw capture → context training → decisions. Selected Chaos content waits for{" "}
              <strong className="text-zinc-200">human review</strong> before training context. Not
              Memory. Not automatic copy of all Chaos.
            </p>
          </header>

          <section aria-labelledby="vault-queue-heading" className="space-y-2">
            <h3
              id="vault-queue-heading"
              className="text-sm font-semibold uppercase tracking-wide text-zinc-400"
            >
              Awaiting review ({open.length})
            </h3>
            {open.length === 0 ? (
              <p className="text-sm text-zinc-600">
                Empty. From a Chaos Deck, select items and use Prepare for Vault.
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
                        <li
                          key={s.itemId}
                          className="flex flex-wrap items-baseline justify-between gap-2"
                        >
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
            <p className="text-xs text-zinc-600">
              {dismissed.length} dismissed package(s) kept locally.
            </p>
          ) : null}
        </section>
      ) : (
        <section className="space-y-4" aria-labelledby="alexandria-heading">
          <header className="space-y-1">
            <h2 id="alexandria-heading" className="text-xl font-bold text-zinc-50">
              Alexandria{" "}
              <span className="text-sm font-normal uppercase tracking-wide text-amber-500">
                Frozen
              </span>
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Consolidated knowledge · learning structures · curated references · retrieval-ready
              content. Reached via bottom <strong className="text-zinc-300">Output</strong> (Vault |
              Alexandria). Content models are not merged with Vault.
            </p>
          </header>
          <p
            role="status"
            className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100/90"
          >
            Alexandria remains <strong>FROZEN</strong> per contract. No Library UI, Locus, Parcour,
            Godot, or evaluation here. Future enrichment is deferred.
          </p>
          <p className="text-xs text-zinc-600">
            Doc: <code className="text-zinc-500">md/argusforge/alexandria-frozen-contract.md</code>
          </p>
          <Link
            href="/forge/vault"
            className="inline-flex min-h-11 items-center text-sm text-sky-400 underline underline-offset-2"
            onClick={() => setVaultMode("vault")}
          >
            Back to Vault preparation
          </Link>
        </section>
      )}
    </div>
  );
}
