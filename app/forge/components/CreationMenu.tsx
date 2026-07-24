"use client";

/**
 * AF03 §4 Creation menu — real actions vs clearly labeled placeholders.
 * No classification / relations required at capture.
 * Image URL + file/PDF stubs are available (§7 — no silent discard).
 */

type CreateAction =
  | "folder"
  | "deck"
  | "text"
  | "link"
  | "image"
  | "file"
  | "pdf"
  | "import";

type Props = {
  scope: "folder" | "deck";
  onAction: (action: CreateAction) => void;
};

const FOLDER_ACTIONS: { id: CreateAction; label: string; available: boolean }[] = [
  { id: "folder", label: "New Folder", available: true },
  { id: "deck", label: "New Chaos Deck", available: true },
  { id: "import", label: "Import content", available: false },
];

const DECK_ACTIONS: { id: CreateAction; label: string; available: boolean }[] = [
  { id: "text", label: "Add fragment (text)", available: true },
  { id: "link", label: "Add fragment (link)", available: true },
  { id: "image", label: "Add fragment (image URL)", available: true },
  { id: "file", label: "Add fragment (file ref)", available: true },
  { id: "pdf", label: "Add fragment (PDF ref)", available: true },
  { id: "import", label: "Import content", available: false },
];

export function CreationMenu({ scope, onAction }: Props) {
  const actions = scope === "folder" ? FOLDER_ACTIONS : DECK_ACTIONS;

  return (
    <div className="space-y-2" role="group" aria-label="Creation menu">
      <p className="text-xs text-zinc-500">
        Capture only — no classification. Fragments go into this Chaos Deck.
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) =>
          a.available ? (
            <button
              key={a.id}
              type="button"
              className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              onClick={() => onAction(a.id)}
            >
              {a.label}
            </button>
          ) : (
            <button
              key={a.id}
              type="button"
              disabled
              title="Not available in this prototype — not presented as functional"
              className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-zinc-800 px-3 text-sm font-medium text-zinc-600"
            >
              {a.label} <span className="text-[10px] uppercase tracking-wide">Soon</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}

export type { CreateAction };
