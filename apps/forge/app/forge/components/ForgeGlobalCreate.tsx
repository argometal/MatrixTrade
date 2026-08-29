"use client";

/**
 * Global Create (+) — CHANGE 24-01 / 24-0F.
 * New Chaos Deck, New Realm (folder internally).
 */

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { realmHref } from "@/lib/argusforge/af03-realm-map";
import {
  createDeck,
  createFolder,
  emptyOrSeedRepo,
} from "@/lib/argusforge/af03-repo-store";
import { UNASSIGNED_REALM_ID } from "@/lib/argusforge/af03-repo-types";

type Props = {
  pathname: string;
  onClose: () => void;
};

function parseFolderId(pathname: string): string | null {
  const m = pathname.match(/^\/forge\/(?:active|archive|library)\/f\/([^/]+)/);
  return m?.[1] ?? null;
}

function parseRealmId(pathname: string): string | null {
  const m = pathname.match(/^\/forge\/realm\/([^/]+)/);
  if (!m) return null;
  const id = decodeURIComponent(m[1]!);
  if (id === UNASSIGNED_REALM_ID) return null;
  return id;
}

export function ForgeGlobalCreate({ pathname, onClose }: Props) {
  const router = useRouter();
  const folderId = useMemo(() => parseFolderId(pathname) ?? parseRealmId(pathname), [pathname]);
  const onArchive = pathname.startsWith("/forge/archive");

  function birthRealm() {
    const state = emptyOrSeedRepo();
    const parentId = onArchive ? null : folderId;
    const { folder } = createFolder(state, {
      title: "New Realm",
      parentId,
      view: "active",
    });
    onClose();
    router.push(realmHref(folder.id));
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
        Global action — separate from Active/Archive. New Chaos Deck / Realm starts as Active.
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
          onClick={birthRealm}
          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          New Realm
        </button>
      </div>
      <button type="button" onClick={onClose} className="min-h-11 w-full text-sm text-zinc-500">
        Cancel
      </button>
    </div>
  );
}
