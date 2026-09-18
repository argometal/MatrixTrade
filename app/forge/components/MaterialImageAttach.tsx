"use client";

/**
 * Attach images onto a Chaos document using existing IndexedDB assets.
 * Drafts (new material) or persisted blocks (Classic / Builder).
 */

import { useRef, type ClipboardEvent, type DragEvent } from "react";
import type { Af03ImageBlockPayload } from "@/lib/argusforge/af03-builder-types";
import type { Af03Block } from "@/lib/argusforge/af03-repo-types";
import { ChaosAssetImage } from "./ChaosAssetImage";
import type { ChaosDraftImage } from "@/lib/argusforge/af03-chaos-dump-images";

export function filesFromPaste(e: ClipboardEvent): File[] {
  const data = e.clipboardData;
  if (!data) return [];
  const out: File[] = [];
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) out.push(file);
    }
  }
  if (out.length === 0) {
    for (const file of Array.from(data.files ?? [])) {
      if (file.type.startsWith("image/")) out.push(file);
    }
  }
  return out;
}

export function filesFromDrop(e: DragEvent): File[] {
  e.preventDefault();
  return Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
}

type Props = {
  persisted?: Af03Block[];
  drafts?: ChaosDraftImage[];
  busy?: boolean;
  notice?: string | null;
  onAddFiles: (files: File[]) => void;
  onRemoveDraft?: (draftId: string) => void;
  onRemovePersisted?: (blockId: string) => void;
  showPersisted?: boolean;
};

export function MaterialImageAttach({
  persisted = [],
  drafts = [],
  busy,
  notice,
  onAddFiles,
  onRemoveDraft,
  onRemovePersisted,
  showPersisted = true,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imageBlocks = showPersisted ? persisted.filter((b) => b.type === "image") : [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const list = e.target.files;
            if (list?.length) onAddFiles(Array.from(list));
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#2f80ed]"
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Adding image…" : "Add image"}
        </button>
        <span className="text-xs text-slate-400">Paste or drop onto the material box</span>
      </div>

      {notice ? (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </p>
      ) : null}

      {drafts.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {drafts.map((img) => (
            <li key={img.draftId} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt=""
                className="h-24 w-24 rounded-lg object-cover"
              />
              {onRemoveDraft ? (
                <button
                  type="button"
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm text-slate-700 shadow-sm"
                  aria-label={`Remove ${img.filename}`}
                  onClick={() => onRemoveDraft(img.draftId)}
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {imageBlocks.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {imageBlocks.map((block) => {
            const payload = block.payload as Af03ImageBlockPayload;
            return (
              <li key={block.id} className="relative overflow-hidden rounded-lg bg-white">
                <ChaosAssetImage
                  assetId={payload.assetId}
                  alt={payload.alt || "Image"}
                  className="max-h-48 w-full object-contain"
                />
                {onRemovePersisted ? (
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-rose-600"
                    onClick={() => onRemovePersisted(block.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
