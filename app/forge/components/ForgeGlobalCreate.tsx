"use client";

/**
 * Global Create sheet — action on the bar, not a birth-into-Active/Archive ontology.
 * New work births Active (DEBT-AF03-01). Options depend on engine + location.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createDeck, createFolder, emptyOrSeedRepo } from "@/lib/argusforge/af03-repo-store";
import { useForgeSystem } from "./ForgeSystemProvider";

type Props = {
  pathname: string;
  onClose: () => void;
};

function parseDeckId(pathname: string): string | null {
  const m = pathname.match(/^\/forge\/deck\/([^/]+)/);
  return m?.[1] ?? null;
}

function parseFolderId(pathname: string): string | null {
  const m = pathname.match(/^\/forge\/(?:active|archive|library)\/f\/([^/]+)/);
  return m?.[1] ?? null;
}

export function ForgeGlobalCreate({ pathname, onClose }: Props) {
  const router = useRouter();
  const { system } = useForgeSystem();
  const deckId = useMemo(() => parseDeckId(pathname), [pathname]);
  const folderId = useMemo(() => parseFolderId(pathname), [pathname]);
  const onArchive = pathname.startsWith("/forge/archive");
  const [msg, setMsg] = useState<string | null>(null);

  if (system === "mta") {
    return (
      <div className="space-y-3 p-3" role="dialog" aria-label="Create">
        <p className="text-sm font-semibold text-zinc-100">Create</p>
        <p className="text-sm leading-relaxed text-zinc-400">
          Global create is Chaos / ArgusForge capture in this prototype. Switch{" "}
          <strong className="text-zinc-200">Engine → Argus Engine</strong> to create folders or
          decks. MTA surfaces stay deep-links (no mixed object birth).
        </p>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 w-full rounded-lg border border-zinc-700 text-sm font-medium text-zinc-200"
        >
          Close
        </button>
      </div>
    );
  }

  if (deckId) {
    return (
      <div className="space-y-3 p-3" role="dialog" aria-label="Create in deck">
        <p className="text-sm font-semibold text-zinc-100">Create in deck</p>
        <p className="text-xs text-zinc-500">
          Use the deck screen + button for text/link/image ingest. This bar opens the deck workspace.
        </p>
        <button
          type="button"
          className="min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-100"
          onClick={() => {
            onClose();
            router.push(`/forge/deck/${deckId}`);
          }}
        >
          Open deck capture
        </button>
        <button type="button" onClick={onClose} className="min-h-11 w-full text-sm text-zinc-500">
          Cancel
        </button>
      </div>
    );
  }

  function birthFolder() {
    const state = emptyOrSeedRepo();
    const parentId = onArchive ? null : folderId;
    const { folder } = createFolder(state, {
      title: "New folder",
      parentId,
      view: "active",
    });
    setMsg(`Created “${folder.title}” in Active.`);
    onClose();
    router.push(`/forge/active/f/${folder.id}`);
  }

  function birthDeck() {
    const state = emptyOrSeedRepo();
    const parentId = onArchive ? null : folderId;
    const { deck } = createDeck(state, {
      title: "New Chaos Deck",
      folderId: parentId,
      view: "active",
    });
    setMsg(`Created “${deck.title}” in Active.`);
    onClose();
    router.push(`/forge/deck/${deck.id}`);
  }

  return (
    <div className="space-y-3 p-3" role="dialog" aria-label="Create">
      <p className="text-sm font-semibold text-zinc-100">Create</p>
      <p className="text-xs leading-relaxed text-zinc-500">
        Global action — not “create inside Active/Archive as worlds”. New work{" "}
        <strong className="text-zinc-300">births as Active</strong>
        {onArchive ? " (Archive is view/preserve, not a birth place)." : "."}
      </p>
      {msg ? <p className="text-xs text-emerald-400">{msg}</p> : null}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={birthFolder}
          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          New folder → Active
        </button>
        <button
          type="button"
          onClick={birthDeck}
          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          New Chaos Deck → Active
        </button>
      </div>
      <button type="button" onClick={onClose} className="min-h-11 w-full text-sm text-zinc-500">
        Cancel
      </button>
    </div>
  );
}
