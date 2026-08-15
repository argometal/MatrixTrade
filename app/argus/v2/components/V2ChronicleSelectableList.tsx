"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { V2ChronicleBulkBar } from "./V2ChronicleBulkBar";
import {
  V2ChronicleNoteDeleteButton,
  chronicleLogIdFromEvidenceId,
  type V2ChronicleDeleteLockProps,
} from "./V2ChronicleNoteDeleteButton";

export type V2ChronicleSelectableItem = {
  /** Stable list key (evidence stream id or `${kind}-${id}`). */
  key: string;
  /** Log id when this row is a deletable chronicle note. */
  logId: string | null;
  title: ReactNode;
  href?: string;
  external?: boolean;
  /** Optional note body shown under the title (journal rows; no phone edit link). */
  preview?: string;
  body: ReactNode;
  /**
   * Extra row chrome outside the primary href (tags, Open Event) —
   * avoids nested links when the row itself navigates (email/file).
   */
  footer?: ReactNode;
};

/** Note body stays hidden until expanded — collapsed preview must disappear, not overlap. */
function ChroniclePreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const body = text.trim();
  if (!body) return null;

  function toggle(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((value) => !value);
  }

  if (!expanded) {
    return (
      <div className="pl-8">
        <button
          type="button"
          onClick={toggle}
          className="text-[11px] font-medium text-violet-300/90 hover:text-violet-200"
          aria-expanded={false}
        >
          Show note
        </button>
      </div>
    );
  }

  return (
    <div className="pl-8">
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">{body}</p>
      <button
        type="button"
        onClick={toggle}
        className="mt-1 text-[11px] font-medium text-violet-300/90 hover:text-violet-200"
        aria-expanded={true}
      >
        Hide note
      </button>
    </div>
  );
}

export function V2ChronicleSelectableList({
  items,
  returnTo,
  empty,
  requiresAuthenticator = false,
  deleteUnlocked = false,
  deleteAuthUnlocked = false,
  deleteCodeConfigured = false,
  totpConfigured = false,
  deleteAuthConfigured = false,
  deleteError = false,
  deleteAuthError = false,
  totpRequired = false,
}: {
  items: V2ChronicleSelectableItem[];
  returnTo: string;
  empty?: ReactNode;
} & V2ChronicleDeleteLockProps) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const selectableLogIds = useMemo(
    () => items.filter((item) => item.logId).map((item) => item.logId as string),
    [items]
  );
  const checkedLogIds = useMemo(() => [...checked], [checked]);
  const allSelected =
    selectableLogIds.length > 0 && selectableLogIds.every((id) => checked.has(id));

  function toggle(logId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }

  function clearSelection() {
    setChecked(new Set());
    setSelectMode(false);
  }

  function selectAllNotes() {
    setSelectMode(true);
    setChecked(new Set(selectableLogIds));
  }

  function finishBulk() {
    clearSelection();
    router.refresh();
  }

  if (items.length === 0) {
    return <>{empty ?? <p className="text-sm text-zinc-500">No entries yet.</p>}</>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (selectMode) clearSelection();
              else setSelectMode(true);
            }}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
              selectMode
                ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {selectMode ? "Cancel select" : "Select"}
          </button>
          {selectMode && selectableLogIds.length > 0 ? (
            <button
              type="button"
              onClick={() => (allSelected ? setChecked(new Set()) : selectAllNotes())}
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300"
            >
              {allSelected ? "Deselect all notes" : "Select all notes"}
            </button>
          ) : null}
        </div>
        {selectableLogIds.length > 0 ? (
          <p className="text-[10px] text-zinc-600">
            {selectableLogIds.length} note{selectableLogIds.length === 1 ? "" : "s"} can be deleted
          </p>
        ) : null}
      </div>

      {checked.size > 0 ? (
        <V2ChronicleBulkBar
          count={checked.size}
          logIds={checkedLogIds}
          returnTo={returnTo}
          requiresAuthenticator={requiresAuthenticator}
          deleteUnlocked={deleteUnlocked}
          deleteAuthUnlocked={deleteAuthUnlocked}
          deleteCodeConfigured={deleteCodeConfigured}
          totpConfigured={totpConfigured}
          deleteAuthConfigured={deleteAuthConfigured}
          deleteError={deleteError}
          deleteAuthError={deleteAuthError}
          onClear={clearSelection}
          onDone={finishBulk}
        />
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => {
          const selectable = Boolean(item.logId);
          const isChecked = item.logId ? checked.has(item.logId) : false;
          const showCheckbox = selectMode && selectable;

          return (
            <li key={item.key}>
              <div
                className={`flex items-stretch gap-2 rounded-xl border transition ${
                  isChecked
                    ? "border-violet-500/40 bg-violet-500/5"
                    : "border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                {showCheckbox && item.logId ? (
                  <div className="flex items-center pl-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(item.logId!)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-violet-500"
                      aria-label={`Select ${typeof item.title === "string" ? item.title : "note"}`}
                    />
                  </div>
                ) : null}
                {item.href ? (
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noreferrer" : undefined}
                      className="flex min-w-0 flex-col gap-1 px-3 py-3"
                    >
                      <span className="flex min-w-0 items-start gap-3">{item.body}</span>
                    </Link>
                    {item.preview ? (
                      <div className="px-3 pb-1">
                        <ChroniclePreview text={item.preview} />
                      </div>
                    ) : null}
                    {item.footer ? <div className="px-3 pb-3 pl-11">{item.footer}</div> : null}
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3">
                    <span className="flex min-w-0 items-start gap-3">{item.body}</span>
                    {item.preview ? <ChroniclePreview text={item.preview} /> : null}
                    {item.footer ? <div className="pl-8 pt-1">{item.footer}</div> : null}
                  </div>
                )}
                {item.logId && !selectMode ? (
                  <div className="flex items-center pr-2">
                    <V2ChronicleNoteDeleteButton
                      logId={item.logId}
                      returnTo={returnTo}
                      requiresAuthenticator={requiresAuthenticator}
                      deleteUnlocked={deleteUnlocked}
                      deleteAuthUnlocked={deleteAuthUnlocked}
                      deleteCodeConfigured={deleteCodeConfigured}
                      totpConfigured={totpConfigured}
                      deleteAuthConfigured={deleteAuthConfigured}
                      deleteError={deleteError}
                      deleteAuthError={deleteAuthError}
                      totpRequired={totpRequired}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { chronicleLogIdFromEvidenceId };
