"use client";

/**
 * Fullscreen expand affordance matching Chaos Dumping (`+`) expand control.
 * Same expand icon button; Back / Done chrome when open.
 */

import {
  useEffect,
  useState,
  type AriaRole,
  type ReactNode,
  type Ref,
} from "react";

export function ForgeExpandIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  children: ReactNode;
  /** Classes for the compact (inline) surface. */
  className?: string;
  /** Ref attached to the content pane (sized area) — useful for ResizeObserver. */
  contentRef?: Ref<HTMLDivElement>;
  /** Dialog label when fullscreen. */
  ariaLabel: string;
  /** Compact-surface role (e.g. tree). Ignored while expanded. */
  surfaceRole?: AriaRole;
  surfaceAriaLabel?: string;
  /** Primary back label, e.g. "Back to Argus". */
  backTitle: string;
  backSubtitle?: string;
  expandAriaLabel?: string;
  expandTitle?: string;
};

export function ForgeExpandableSurface({
  children,
  className = "",
  contentRef,
  ariaLabel,
  surfaceRole,
  surfaceAriaLabel,
  backTitle,
  backSubtitle = "Collapse view",
  expandAriaLabel = "Expand fullscreen",
  expandTitle = "Expand",
}: Props) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-[120] flex flex-col bg-zinc-950"
          : className
      }
      role={expanded ? "dialog" : surfaceRole}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? ariaLabel : surfaceAriaLabel}
    >
      {expanded ? (
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex min-h-11 min-w-0 items-start gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <span aria-hidden className="mt-0.5 text-lg text-zinc-300">
              ←
            </span>
            <span>
              <span className="block text-sm font-semibold text-zinc-100">{backTitle}</span>
              <span className="block text-[11px] text-zinc-500">{backSubtitle}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="min-h-11 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <span className="block text-sm font-semibold text-sky-400">Done</span>
            <span className="block text-[11px] text-zinc-500">Collapse &amp; return</span>
          </button>
        </header>
      ) : null}

      <div
        ref={contentRef}
        className={
          expanded
            ? "relative min-h-0 flex-1 overflow-hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            : "absolute inset-0"
        }
      >
        {children}
      </div>

      {!expanded ? (
        <button
          type="button"
          aria-label={expandAriaLabel}
          title={expandTitle}
          onClick={() => setExpanded(true)}
          className="absolute bottom-2 right-2 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/90 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <ForgeExpandIcon />
        </button>
      ) : null}
    </div>
  );
}
