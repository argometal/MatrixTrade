"use client";

import { useState } from "react";
import type { ReferenceKind } from "@/lib/argus/reference-types";
import { EntityPicker, type EntityPickerBuckets } from "./EntityPicker";

export function ClassifyLogForm({
  logId,
  buckets,
  action,
}: {
  logId: string;
  buckets: EntityPickerBuckets;
  action: (formData: FormData) => Promise<void>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [canSubmit, setCanSubmit] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreateKind, setQuickCreateKind] = useState<ReferenceKind>("person");
  const [quickCreateNotes, setQuickCreateNotes] = useState("");

  return (
    <form action={action} className="mb-4 space-y-3 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
      <input type="hidden" name="logId" value={logId} />
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="entityIds" value={id} />
      ))}
      <p className="text-sm font-medium text-amber-200">Needs classification</p>
      <p className="text-xs text-amber-200/70">Link this item to one or more entities.</p>
      <EntityPicker
        buckets={buckets}
        selectedIds={selectedIds}
        onChange={setSelectedIds}
        onValidityChange={setCanSubmit}
        quickCreateName={quickCreateName}
        onQuickCreateNameChange={setQuickCreateName}
        quickCreateKind={quickCreateKind}
        onQuickCreateKindChange={setQuickCreateKind}
        quickCreateNotes={quickCreateNotes}
        onQuickCreateNotesChange={setQuickCreateNotes}
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        Assign entities
      </button>
    </form>
  );
}
