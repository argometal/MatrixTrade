"use client";

import { useState, useTransition } from "react";
import { createEntityAction } from "@/app/argus/actions";
import {
  createInputToReferenceKind,
  entityNotesForDisplay,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import type { EntityType } from "@/lib/argus/types";
import { ENTITY_CREATE } from "@/lib/argus/ux-copy";
import { ReferenceCreateModal } from "./ReferenceCreateModal";

export function EntityCreateLauncher() {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleSave(data: { name: string; entityType: EntityType; notes: string }) {
    const kind = createInputToReferenceKind(data.entityType, data.notes);
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("kind", kind);
    formData.set("notes", entityNotesForDisplay(data.notes));

    startTransition(() => {
      void createEntityAction(formData);
    });
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ENTITY_CREATE.fab}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xl font-light text-teal-300 shadow-lg shadow-black/40 transition hover:border-teal-700 hover:bg-zinc-800 active:scale-95"
      >
        ◇
      </button>
      <ReferenceCreateModal
        open={open}
        onCancel={() => setOpen(false)}
        onSave={handleSave}
        title={ENTITY_CREATE.title}
        saveLabel={ENTITY_CREATE.save}
        notesOptional
      />
    </>
  );
}
