"use client";

import type { ReactNode } from "react";

/** Minimal markdown-ish render for AF03 Viewer — not Alexandria. */
export function SimpleMarkdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n\n+/);

  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-zinc-200">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const lines = trimmed.split("\n");
        if (lines.every((l) => /^[-*]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 text-zinc-300">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={i} className="text-2xl font-bold tracking-tight text-zinc-50">
              {inline(trimmed.slice(2))}
            </h1>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="text-xl font-semibold text-zinc-100">
              {inline(trimmed.slice(3))}
            </h2>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="text-lg font-semibold text-zinc-100">
              {inline(trimmed.slice(4))}
            </h3>
          );
        }

        const imgOnly = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgOnly) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={imgOnly[2]}
              alt={imgOnly[1] || "image"}
              className="max-h-[28rem] w-full rounded-lg border border-zinc-800 object-contain bg-zinc-900"
            />
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap text-zinc-300">
            {inline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      parts.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key++}
          src={m[3]}
          alt={m[2] || ""}
          className="my-2 max-h-64 max-w-full rounded border border-zinc-800 object-contain"
        />
      );
    } else {
      parts.push(
        <a
          key={key++}
          href={m[6]}
          target="_blank"
          rel="noreferrer"
          className="text-sky-400 underline underline-offset-2"
        >
          {m[5]}
        </a>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
