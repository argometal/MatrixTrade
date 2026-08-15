"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export type ForgeSystemId =
  | "argus"
  | "matrixtrade"
  | "alexandria"
  | "praxis"
  | "vault"
  | "argusforge";

export type ForgeSystem = {
  id: ForgeSystemId;
  name: string;
  description: string;
  href: string;
  status: "active" | "ready" | "frozen" | "planned";
  statusLabel: string;
  tone: "blue" | "green" | "purple" | "orange" | "indigo";
};

/** Live destinations + documented systems (Alexandria frozen, Praxis planned). */
export const FORGE_SYSTEMS: ForgeSystem[] = [
  {
    id: "argus",
    name: "Argus",
    description: "Intelligence & analysis platform",
    href: "/argus/v2",
    status: "active",
    statusLabel: "Active",
    tone: "blue",
  },
  {
    id: "matrixtrade",
    name: "MatrixTrade",
    description: "Trading · Scout · Capital",
    href: "/home-preview",
    status: "ready",
    statusLabel: "Ready",
    tone: "green",
  },
  {
    id: "argusforge",
    name: "ArgusForge",
    description: "Capture · Explorer · Chaos",
    href: "/forge",
    status: "ready",
    statusLabel: "Ready",
    tone: "indigo",
  },
  {
    id: "vault",
    name: "Vault",
    description: "Prepared output & handoff",
    href: "/forge/vault",
    status: "ready",
    statusLabel: "Ready",
    tone: "indigo",
  },
  {
    id: "alexandria",
    name: "Alexandria",
    description: "Spatial knowledge motor (frozen)",
    href: "/forge/vault",
    status: "frozen",
    statusLabel: "Frozen",
    tone: "purple",
  },
  {
    id: "praxis",
    name: "Praxis",
    description: "Execution & rehearsal (planned)",
    href: "/apps",
    status: "planned",
    statusLabel: "Planned",
    tone: "orange",
  },
];

const TONE: Record<ForgeSystem["tone"], { hex: string; soft: string }> = {
  blue: { hex: "#2563eb", soft: "#dbeafe" },
  green: { hex: "#059669", soft: "#d1fae5" },
  purple: { hex: "#7c3aed", soft: "#ede9fe" },
  orange: { hex: "#ea580c", soft: "#ffedd5" },
  indigo: { hex: "#4f46e5", soft: "#e0e7ff" },
};

export function ForgeHexIcon({
  tone,
  label,
  size = 44,
}: {
  tone: ForgeSystem["tone"];
  label: string;
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const colors = TONE[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`fh-${uid}`} x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor={colors.hex} stopOpacity="0.95" />
          <stop offset="1" stopColor={colors.hex} stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5 42 14v20L24 44.5 6 34V14L24 3.5Z"
        fill={`url(#fh-${uid})`}
        stroke={colors.hex}
        strokeWidth="1.25"
      />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {label.slice(0, 1)}
      </text>
    </svg>
  );
}

/** Triangular A mark — Forge Home control. */
export function ForgeHomeMark({ size = 36 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <defs>
        <linearGradient id={`fa-${uid}`} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <path
        d="M20 3.5 36.5 33.5H3.5L20 3.5Z"
        fill={`url(#fa-${uid})`}
        stroke="#1e40af"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M20 12.5 28.2 28H11.8L20 12.5Z" fill="#eff6ff" opacity="0.95" />
      <path d="M15.2 22.5h9.6" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Quick navigate menu. Trigger is the triangular A mark (replaces ···).
 * Opens the systems list — including Forge Home — so chrome needs no second A link.
 */
export function ForgeQuickNavMenu({
  currentId,
  className = "",
  theme = "light",
}: {
  currentId?: ForgeSystemId | "home";
  className?: string;
  theme?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dark = theme === "dark";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        aria-label="Open systems"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Systems"
        onClick={() => setOpen((v) => !v)}
        className={
          dark
            ? `relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                open
                  ? "border-violet-500/50 bg-violet-500/15 ring-2 ring-violet-500/20"
                  : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-900"
              }`
            : `flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                open
                  ? "border-blue-300 bg-blue-50 shadow-sm"
                  : "border-zinc-200 bg-white shadow-sm hover:border-zinc-300"
              }`
        }
      >
        <ForgeHomeMark size={dark ? 22 : 26} />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="ARGUS FORGE Systems"
          className={
            dark
              ? "absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40"
              : "absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/10"
          }
        >
          <p
            className={
              dark
                ? "border-b border-zinc-800 px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
                : "border-b border-zinc-100 px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
            }
          >
            ARGUS FORGE Systems
          </p>
          <ul className="max-h-[min(22rem,70vh)] overflow-y-auto py-1">
            <li>
              <Link
                href="/apps"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={
                  dark
                    ? `flex items-center gap-3 px-3.5 py-2.5 text-sm transition hover:bg-zinc-800/80 ${
                        currentId === "home" ? "bg-zinc-800" : ""
                      }`
                    : `flex items-center gap-3 px-3.5 py-2.5 text-sm transition hover:bg-zinc-50 ${
                        currentId === "home" ? "bg-blue-50/80" : ""
                      }`
                }
              >
                <ForgeHomeMark size={28} />
                <span className="min-w-0 flex-1">
                  <span className={`block font-medium ${dark ? "text-zinc-100" : "text-zinc-900"}`}>
                    Forge Home
                  </span>
                  <span className={`block truncate text-[11px] ${dark ? "text-zinc-500" : "text-zinc-500"}`}>
                    All systems · one workspace
                  </span>
                </span>
                {currentId === "home" ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                    Active
                  </span>
                ) : null}
              </Link>
            </li>
            {FORGE_SYSTEMS.filter((s) => s.status !== "planned").map((system) => {
              const active = currentId === system.id;
              return (
                <li key={system.id}>
                  <Link
                    href={system.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={
                      dark
                        ? `flex items-center gap-3 px-3.5 py-2.5 text-sm transition hover:bg-zinc-800/80 ${
                            active ? "bg-zinc-800" : ""
                          }`
                        : `flex items-center gap-3 px-3.5 py-2.5 text-sm transition hover:bg-zinc-50 ${
                            active ? "bg-blue-50/80" : ""
                          }`
                    }
                  >
                    <ForgeHexIcon tone={system.tone} label={system.name} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className={`block font-medium ${dark ? "text-zinc-100" : "text-zinc-900"}`}>
                        {system.name}
                      </span>
                      <span className={`block truncate text-[11px] ${dark ? "text-zinc-500" : "text-zinc-500"}`}>
                        {system.description}
                      </span>
                    </span>
                    {active ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                        Active
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
