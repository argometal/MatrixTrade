"use client";

/**
 * Global Create (+) — CHANGE 24-01.
 * Existing creation actions only: New Chaos Deck, New Folder.
 * Not birth-into-Active/Archive as separate worlds.
 */

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { createDeck, createFolder, emptyOrSeedRepo } from "@/lib/argusforge/af03-repo-store";

type Props = {
  pathname: string;
  onClose: () => void;
};

function parseFolderId(pathname: string): string | null {
  const m = pathname.match(/^\/forge\/(?:active|archive|library)\/f\/([^/]+)/);
  return m?.[1] ?? null;
}

export function ForgeGlobalCreate({ pathname, onClose }: Props) {
  const router = useRouter();
  const folderId = useMemo(() => parseFolderId(pathname), [pathname]);
  const onArchive = pathname.startsWith("/forge/archive");

  function birthFolder() {
    const state = emptyOrSeedRepo();
    const parentId = onArchive ? null : folderId;
    const { folder } = createFolder(state, {
      title: "New folder",
      parentId,
      view: "active",
    });
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
    onClose();
    router.push(`/forge/deck/${deck.id}`);
  }

  return (
    <div className="space-y-3 p-3" role="dialog" aria-label="Create">
      <p className="text-sm font-semibold text-zinc-100">Create</p>
      <p className="text-xs leading-relaxed text-zinc-500">
        Global action — separate from Active/Archive. New Chaos Deck / folder starts as Active.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={birthDeck}
          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          New Chaos Deck
        </button>
        <button
          type="button"
          onClick={birthFolder}
          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          New Folder
        </button>
      </div>
      <button type="button" onClick={onClose} className="min-h-11 w-full text-sm text-zinc-500">
        Cancel
      </button>
    </div>
  );
}
