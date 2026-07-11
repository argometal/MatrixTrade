"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function V2AttachmentComposer({
  files,
  onChange,
  enablePaste = true,
  label = "Files",
  hint = "Choose files or paste with Ctrl+V (images and documents).",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  enablePaste?: boolean;
  label?: string;
  hint?: string;
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const next = [...files];
      const seen = new Set(files.map(fileKey));
      for (const file of Array.from(incoming)) {
        if (!file.size) continue;
        const key = fileKey(file);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(file);
      }
      if (next.length !== files.length) onChange(next);
    },
    [files, onChange]
  );

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const pasted = [...clipboard.files];
      if (pasted.length === 0) return;
      event.preventDefault();
      addFiles(pasted);
      setOpen(true);
    },
    [addFiles]
  );

  useEffect(() => {
    if (!enablePaste) return;
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [enablePaste, handlePaste]);

  const photoCount = files.filter((f) => f.type.startsWith("image/")).length;
  const fileCount = files.length - photoCount;

  return (
    <div ref={zoneRef} className="rounded-xl border border-zinc-800/80 bg-zinc-900/30">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs"
      >
        <span className="font-medium text-zinc-300">
          {label}
          {files.length > 0 ? (
            <span className="ml-2 text-violet-300">
              {photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : null}
              {photoCount > 0 && fileCount > 0 ? " · " : null}
              {fileCount > 0 ? `${fileCount} file${fileCount === 1 ? "" : "s"}` : null}
            </span>
          ) : null}
        </span>
        <span className="text-[10px] text-zinc-500">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="border-t border-zinc-800/80 px-3 py-3">
          <p className="mb-2 text-[11px] text-zinc-600">{hint}</p>
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Choose files…
          </label>
          <input
            id={inputId}
            type="file"
            multiple
            accept="image/*,*/*"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {files.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {files.map((file, index) => (
                <li
                  key={fileKey(file)}
                  className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950/60 px-2.5 py-1.5 text-[11px] text-zinc-400"
                >
                  <span className="min-w-0 truncate">
                    {file.type.startsWith("image/") ? "📷" : "📎"} {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="shrink-0 text-zinc-600 hover:text-zinc-300"
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-zinc-600">No files queued. Paste with Ctrl+V on this page.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
