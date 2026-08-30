"use client";

/**
 * AF03 creation menu — CHANGE 24-47: Classic Capture owns text/link/image.
 * Secondary/limited: Structured Fragment, File/PDF reference.
 */

type CreateAction =
  | "folder"
  | "deck"
  | "text"
  | "link"
  | "image"
  | "file"
  | "pdf"
  | "import"
  | "structured";

type Props = {
  scope: "folder" | "deck";
  onAction: (action: CreateAction) => void;
};

const FOLDER_ACTIONS: { id: CreateAction; label: string; available: boolean }[] = [
  { id: "folder", label: "New Realm", available: true },
  { id: "deck", label: "New Chaos Deck", available: true },
  { id: "import", label: "Import content", available: false },
];

/** Primary text/link/image URL removed — Classic Capture covers them. */
const DECK_ACTIONS: { id: CreateAction; label: string; available: boolean; limited?: boolean }[] = [
  { id: "structured", label: "Structured Fragment", available: true },
  { id: "file", label: "File reference", available: true, limited: true },
  { id: "pdf", label: "PDF reference", available: true, limited: true },
  { id: "import", label: "Import content", available: false },
];

export function CreationMenu({ scope, onAction }: Props) {
  const actions = scope === "folder" ? FOLDER_ACTIONS : DECK_ACTIONS;

  if (scope === "deck") {
    return (
      <div className="space-y-2" role="group" aria-label="Secondary creation">
        <p className="text-xs text-zinc-400">
          Secondary actions — capture text, links, and images in the box above.
        </p>
        <div className="flex flex-wrap gap-2">
          {DECK_ACTIONS.map((a) =>
            a.available ? (
              <button
                key={a.id}
                type="button"
                className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                onClick={() => onAction(a.id)}
              >
                {a.label}
                {a.limited ? (
                  <span className="ml-1 text-[10px] uppercase tracking-wide text-zinc-500">
                    limited
                  </span>
                ) : null}
              </button>
            ) : (
              <button
                key={a.id}
                type="button"
                disabled
                title="Not available yet"
                className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-zinc-800 px-3 text-sm font-medium text-zinc-600"
              >
                {a.label}{" "}
                <span className="text-[10px] uppercase tracking-wide">Soon</span>
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" role="group" aria-label="Creation menu">
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
              title="Not available yet"
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
